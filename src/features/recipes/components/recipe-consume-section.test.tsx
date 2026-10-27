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
		expect(screen.getByText(/玉ねぎ：2個を引きました/u)).toBeInTheDocument();
		expect(
			screen.getByText(/卵：在庫が足りず、4個だけ引きました（必要な量は6個）/u),
		).toBeInTheDocument();
		expect(screen.getByText(/塩：.*減らしていません/u)).toBeInTheDocument();
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
			await screen.findByText(
				/玉ねぎ：100gを引きました（冷凍玉ねぎ\(みじん切り\)から）/u,
			),
		).toBeInTheDocument();
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
			await screen.findByText(
				/オリーブオイル：「ある」で管理しているため、減らしていません/u,
			),
		).toBeInTheDocument();
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

		const checkbox = screen.getByRole("checkbox", {
			name: "できあがりを、在庫に入れる",
		});

		expect(checkbox).not.toBeChecked();

		await user.click(screen.getByRole("button", { name: /つくった/u }));
		await screen.findAllByText(/を引きました/u);

		expect(produce).not.toHaveBeenCalled();
		expect(
			screen.queryByText(/在庫に入れました|在庫に入れられません/u),
		).toBeNull();
	});

	it("初期値が入れないでも、チェックすれば、できあがりを在庫に入れる", async () => {
		const user = userEvent.setup();
		const produce = vi.fn(
			async (_input: { sourceId: string; transactionId: string }) => {},
		);

		setup({
			madeRecipe: { name: "和風ドレッシング", defaultChecked: false, produce },
		});

		await user.click(
			screen.getByRole("checkbox", { name: "できあがりを、在庫に入れる" }),
		);
		await user.click(screen.getByRole("button", { name: /つくった/u }));

		expect(
			await screen.findByText("和風ドレッシング：1回分を、在庫に入れました"),
		).toBeInTheDocument();
		expect(produce).toHaveBeenCalledTimes(1);
	});
});
