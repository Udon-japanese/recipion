import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import type { RecipeConsumptionOperation } from "../application/consume-recipe-ingredients";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import { RecipeConsumeSection } from "./recipe-consume-section";

function ingredient(
	id: string,
	name: string,
	quantity: number | null,
	unitLabel: string | null,
): RecipeEditorIngredientNode {
	return {
		type: "ingredient",
		id,
		status: "parsed",
		rawText: name,
		name,
		amountText: quantity === null ? "少々" : `${quantity}${unitLabel ?? ""}`,
		quantity,
		unitLabel,
	} as RecipeEditorIngredientNode;
}

const ingredients = [
	ingredient("i1", "玉ねぎ", 2, "個"),
	ingredient("i2", "卵", 6, "個"),
	ingredient("i3", "塩", null, null),
];

const stock = [
	buildInventoryListItem({
		inventoryItemId: "inv-onion",
		name: "玉ねぎ",
		quantity: 3,
	}),
	buildInventoryListItem({
		inventoryItemId: "inv-egg",
		name: "卵",
		quantity: 4,
	}),
];

function setup(
	overrides: Partial<Parameters<typeof RecipeConsumeSection>[0]> = {},
) {
	const consume = vi.fn(
		async (
			operation: RecipeConsumptionOperation,
			onlyNeedIds?: ReadonlySet<string>,
		) =>
			operation.entries
				.filter((entry) => !onlyNeedIds || onlyNeedIds.has(entry.needId))
				.map((entry) => ({ needId: entry.needId, ok: true as const })),
	);
	const undo = vi.fn(async () => ({
		status: "undone" as const,
		items: [],
		unreturnedProduction: 0,
	}));

	render(
		<RecipeConsumeSection
			recipePublicId="recipe-1"
			ingredients={ingredients}
			ownerScope="user:user-id"
			loadInventoryItems={async () => stock}
			consume={consume}
			undo={undo}
			{...overrides}
		/>,
	);

	return { consume, undo };
}

describe("RecipeConsumeSection", () => {
	it("ゲストには表示しない", () => {
		setup({ ownerScope: "guest" });

		expect(screen.queryByRole("button", { name: /つくった/u })).toBeNull();
	});

	it("押すとすぐに在庫から引き、足りない分はある分だけ引き、少々は減らさない", async () => {
		const user = userEvent.setup();
		const { consume } = setup();

		await user.click(screen.getByRole("button", { name: /つくった/u }));

		expect(
			await screen.findByText("在庫から2件を引きました"),
		).toBeInTheDocument();
		expect(consume).toHaveBeenCalledTimes(1);
		expect(
			consume.mock.calls[0]?.[0].entries.map((entry) => [
				entry.inventoryItemId,
				entry.quantity,
			]),
		).toEqual([
			["inv-onion", 2],
			["inv-egg", 4],
		]);
		const deducted = screen.getByRole("list", { name: "引いたもの" });

		expect(deducted).toHaveTextContent("玉ねぎ2個");
		expect(deducted).toHaveTextContent(
			"卵4個在庫が足りず、ある分だけ（必要な量は6個）",
		);
		expect(
			screen.getByRole("region", { name: /減らしていません/u }),
		).toHaveTextContent("塩");
	});

	it("形が決まっている冷凍（みじん切り）は、自動では引かず、ボタンで選んだときだけ、同じ操作に足して引く", async () => {
		const user = userEvent.setup();
		const { consume } = setup({
			ingredients: [ingredient("i1", "玉ねぎ", 100, "g")],
			loadInventoryItems: async () => [
				buildInventoryListItem({
					inventoryItemId: "inv-frozen",
					name: "冷凍玉ねぎ(みじん切り)",
					quantity: 500,
					stockUnitCode: "g",
					stockUnitLabel: "g",
				}),
			],
		});

		await user.click(screen.getByRole("button", { name: /つくった/u }));

		expect(
			await screen.findByText(
				/玉ねぎ：在庫にないため.*冷凍玉ねぎ\(みじん切り\)の在庫があります/u,
			),
		).toBeInTheDocument();
		expect(consume.mock.calls[0]?.[0].entries).toEqual([]);

		await user.click(
			screen.getByRole("button", {
				name: "冷凍玉ねぎ(みじん切り)を引く（100g）",
			}),
		);

		expect(
			await screen.findByRole("list", { name: "引いたもの" }),
		).toHaveTextContent("玉ねぎ100g冷凍玉ねぎ(みじん切り)から");
		expect(screen.getByText("在庫から1件を引きました")).toBeInTheDocument();

		const [operation, only] = consume.mock.calls[1] ?? [];

		expect(
			operation?.entries.map((entry) => [
				entry.inventoryItemId,
				entry.quantity,
			]),
		).toEqual([["inv-frozen", 100]]);
		expect(only).toEqual(new Set(["i1"]));
		// 最初の操作と同じ印なので、「元に戻す」で、まとめて戻せる。
		expect(operation?.sourceId).toBe(consume.mock.calls[0]?.[0].sourceId);
	});

	it("有無だけで管理している食材は、量が決まっていても減らさず、その理由を表示する", async () => {
		const user = userEvent.setup();
		const { consume } = setup({
			ingredients: [ingredient("i1", "オリーブオイル", 2, "大さじ")],
			loadInventoryItems: async () => [
				buildInventoryListItem({
					inventoryItemId: "inv-oil",
					name: "オリーブオイル",
					quantity: 1,
					stockUnitCode: "ml",
					stockUnitLabel: "ml",
					trackingMode: "presence",
				}),
			],
		});

		await user.click(screen.getByRole("button", { name: /つくった/u }));

		expect(
			await screen.findByRole("region", {
				name: /「ある」で管理しているため、減らしていません/u,
			}),
		).toHaveTextContent("オリーブオイル");
		expect(consume.mock.calls[0]?.[0].entries).toEqual([]);
	});

	it("同じ食材の行は1行にまとめて、1回で引く（足りる量なら、合計を引く）", async () => {
		const user = userEvent.setup();
		const { consume } = setup({
			ingredients: [
				ingredient("i1", "玉ねぎ", 1, "個"),
				ingredient("i2", "玉ねぎ", 1, "個"),
			],
		});

		await user.click(screen.getByRole("button", { name: /つくった/u }));

		await screen.findByText(/在庫から1件を引きました/u);
		expect(
			consume.mock.calls[0]?.[0].entries.map((entry) => [
				entry.inventoryItemId,
				entry.quantity,
			]),
		).toEqual([["inv-onion", 2]]);
	});

	it("元に戻すと、同じ操作の印で取り消す", async () => {
		const user = userEvent.setup();
		const { consume, undo } = setup();

		await user.click(screen.getByRole("button", { name: /つくった/u }));
		await user.click(await screen.findByRole("button", { name: "元に戻す" }));

		expect(await screen.findByText("元に戻しました")).toBeInTheDocument();
		expect(undo).toHaveBeenCalledWith(consume.mock.calls[0]?.[0].sourceId);
		expect(screen.queryByRole("button", { name: "元に戻す" })).toBeNull();
	});

	it("引けなかった行だけ、やり直せる", async () => {
		const user = userEvent.setup();
		const consume = vi
			.fn()
			.mockImplementationOnce(async (operation: RecipeConsumptionOperation) => [
				{ needId: operation.entries[0]?.needId, ok: true },
				{
					needId: operation.entries[1]?.needId,
					ok: false,
					error: new Error("offline"),
				},
			])
			.mockImplementationOnce(
				async (
					operation: RecipeConsumptionOperation,
					only: ReadonlySet<string>,
				) =>
					operation.entries
						.filter((entry) => only.has(entry.needId))
						.map((entry) => ({ needId: entry.needId, ok: true })),
			);

		setup({ consume });

		await user.click(screen.getByRole("button", { name: /つくった/u }));

		expect(
			await screen.findByText(/卵：引けませんでした/u),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "引けなかった分をやり直す" }),
		);

		await waitFor(() =>
			expect(screen.getByText("在庫から2件を引きました")).toBeInTheDocument(),
		);
		expect(consume.mock.calls[1]?.[1]).toEqual(new Set(["i2"]));
	});

	it("元に戻せなかったときは、エラーを出し、戻すボタンを残す", async () => {
		const user = userEvent.setup();

		setup({
			undo: vi.fn(async () => {
				throw new Error("offline");
			}),
		});

		await user.click(screen.getByRole("button", { name: /つくった/u }));
		await user.click(await screen.findByRole("button", { name: "元に戻す" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"元に戻せませんでした",
		);
		expect(screen.getByRole("button", { name: "元に戻す" })).toBeEnabled();
	});

	it("作り置きのレシピは、引いたあとで、できあがりを在庫に入れる。元に戻すと、使い済みの分は戻せないと知らせる", async () => {
		const user = userEvent.setup();
		const produce = vi.fn(
			async (_input: { sourceId: string; transactionId: string }) => {},
		);
		const { undo } = setup({
			madeRecipe: { name: "和風ドレッシング", defaultChecked: true, produce },
		});

		undo.mockResolvedValueOnce({
			status: "undone" as const,
			items: [],
			unreturnedProduction: 0.5,
		});

		await user.click(screen.getByRole("button", { name: /つくった/u }));

		expect(
			await screen.findByText("和風ドレッシング：1回分を、在庫に入れました"),
		).toBeInTheDocument();
		expect(produce).toHaveBeenCalledTimes(1);
		expect(produce.mock.calls[0]?.[0].sourceId).toMatch(/^recipe-1:/u);

		await user.click(screen.getByRole("button", { name: "元に戻す" }));

		expect(
			await screen.findByText(/回分は、在庫から減らせませんでした/u),
		).toBeInTheDocument();
	});

	it("できあがりを在庫に入れられなかったときは、知らせて、同じ操作でやり直せる（二重には入らない）", async () => {
		const user = userEvent.setup();
		const produce = vi
			.fn<
				(input: { sourceId: string; transactionId: string }) => Promise<void>
			>()
			.mockRejectedValueOnce(new Error("network"))
			.mockResolvedValueOnce(undefined);

		setup({
			madeRecipe: { name: "和風ドレッシング", defaultChecked: true, produce },
		});

		await user.click(screen.getByRole("button", { name: /つくった/u }));

		expect(
			await screen.findByText("和風ドレッシング：在庫に入れられませんでした"),
		).toBeInTheDocument();

		await user.click(
			screen.getByRole("button", { name: "在庫に入れる分をやり直す" }),
		);

		expect(
			await screen.findByText("和風ドレッシング：1回分を、在庫に入れました"),
		).toBeInTheDocument();
		expect(produce.mock.calls[0]?.[0].transactionId).toBe(
			produce.mock.calls[1]?.[0].transactionId,
		);
	});

	it("作り置きでないレシピは、在庫に入れない", async () => {
		const user = userEvent.setup();

		setup();

		await user.click(screen.getByRole("button", { name: /つくった/u }));

		expect(await screen.findAllByText(/を引きました/u)).not.toHaveLength(0);
		expect(
			screen.queryByText(/在庫に入れました|在庫に入れられません/u),
		).toBeNull();
	});

	it("在庫に入れるかどうかは、押す前に決められる（初期値は、レシピの作り置きの設定）", async () => {
		const user = userEvent.setup();
		const produce = vi.fn(
			async (_input: { sourceId: string; transactionId: string }) => {},
		);

		setup({
			madeRecipe: { name: "和風ドレッシング", defaultChecked: false, produce },
		});

		expect(screen.queryByText("できあがりも在庫に入れます")).toBeNull();
		await user.click(screen.getByRole("button", { name: "作ったときの設定" }));
		expect(
			screen.getByRole("switch", { name: "できあがりも在庫に入れる" }),
		).not.toBeChecked();

		await user.click(screen.getByRole("button", { name: /つくった/u }));
		await screen.findAllByText(/を引きました/u);

		expect(produce).not.toHaveBeenCalled();
		expect(
			screen.queryByText(/在庫に入れました|在庫に入れられません/u),
		).toBeNull();
	});

	it("初期値が入れないでも、設定で選べば、できあがりを在庫に入れる", async () => {
		const user = userEvent.setup();
		const produce = vi.fn(
			async (_input: { sourceId: string; transactionId: string }) => {},
		);

		setup({
			madeRecipe: { name: "和風ドレッシング", defaultChecked: false, produce },
		});

		await user.click(screen.getByRole("button", { name: "作ったときの設定" }));
		await user.click(
			screen.getByRole("switch", { name: "できあがりも在庫に入れる" }),
		);

		expect(screen.getByText("できあがりも在庫に入れます")).toBeInTheDocument();
		await user.click(screen.getByRole("button", { name: /つくった/u }));

		expect(
			await screen.findByText("和風ドレッシング：1回分を、在庫に入れました"),
		).toBeInTheDocument();
		expect(produce).toHaveBeenCalledTimes(1);
	});

	describe("リンク先のできあがり（作り置き）", () => {
		const dressing = {
			publicId: "dressing-id",
			name: "和風ドレッシング",
			servings: 2,
			ingredients: [ingredient("d-0", "醤油", 100, "ml")],
			linkViews: [],
		} as unknown as Awaited<
			ReturnType<
				NonNullable<
					Parameters<typeof RecipeConsumeSection>[0]["loadLinkedRecipe"]
				>
			>
		>;
		const linkIngredient = {
			...ingredient("l1", "[[和風ドレッシング]]", 0.5, "量"),
			amountText: "半分",
		} as RecipeEditorIngredientNode;
		const linkViews = [
			{
				label: "和風ドレッシング",
				target: { publicId: "dressing-id", name: "和風ドレッシング" },
			},
		];
		const soy = buildInventoryListItem({
			inventoryItemId: "inv-soy",
			name: "醤油",
			quantity: 500,
			stockUnitCode: "ml",
			stockUnitLabel: "ml",
		});

		it("在庫にあるできあがりを先に引き、その分の材料は引かない", async () => {
			const user = userEvent.setup();
			const { consume } = setup({
				ingredients: [linkIngredient],
				linkViews,
				loadLinkedRecipe: async () => dressing,
				loadInventoryItems: async () => [
					soy,
					buildInventoryListItem({
						inventoryItemId: "inv-dressing",
						name: "和風ドレッシング",
						quantity: 1,
						stockUnitLabel: "回分",
						sourceRecipePublicId: "dressing-id",
					}),
				],
			});

			await user.click(screen.getByRole("button", { name: /つくった/u }));

			const deducted = await screen.findByRole("list", { name: "引いたもの" });

			expect(deducted).toHaveTextContent("和風ドレッシング");
			expect(deducted).toHaveTextContent(
				"在庫のできあがりから（材料は引いていません）",
			);
			expect(
				consume.mock.calls[0]?.[0].entries.map((entry) => [
					entry.inventoryItemId,
					entry.quantity,
				]),
			).toEqual([["inv-dressing", 0.5]]);
		});

		it("チェックを外すと、できあがりの在庫があっても、材料から引く", async () => {
			const user = userEvent.setup();
			const { consume } = setup({
				ingredients: [linkIngredient],
				linkViews,
				loadLinkedRecipe: async () => dressing,
				loadInventoryItems: async () => [
					soy,
					buildInventoryListItem({
						inventoryItemId: "inv-dressing",
						name: "和風ドレッシング",
						quantity: 1,
						stockUnitLabel: "回分",
						sourceRecipePublicId: "dressing-id",
					}),
				],
			});

			await user.click(
				screen.getByRole("button", { name: "作ったときの設定" }),
			);
			await user.click(
				screen.getByRole("switch", {
					name: "リンク先は在庫のできあがりを使う",
				}),
			);
			await user.click(screen.getByRole("button", { name: /つくった/u }));
			await screen.findAllByText(/を引きました/u);

			expect(
				consume.mock.calls[0]?.[0].entries.map((entry) => [
					entry.inventoryItemId,
					entry.quantity,
				]),
			).toEqual([["inv-soy", 50]]);
		});

		it("リンクのないレシピには、このチェックを出さない", () => {
			setup();

			expect(
				screen.queryByRole("button", { name: "作ったときの設定" }),
			).toBeNull();
		});

		it("できあがりの在庫がなければ、材料を引く", async () => {
			const user = userEvent.setup();
			const { consume } = setup({
				ingredients: [linkIngredient],
				linkViews,
				loadLinkedRecipe: async () => dressing,
				loadInventoryItems: async () => [soy],
			});

			await user.click(screen.getByRole("button", { name: /つくった/u }));
			await screen.findAllByText(/を引きました/u);

			expect(
				consume.mock.calls[0]?.[0].entries.map((entry) => [
					entry.inventoryItemId,
					entry.quantity,
				]),
			).toEqual([["inv-soy", 50]]);
		});
	});
});
