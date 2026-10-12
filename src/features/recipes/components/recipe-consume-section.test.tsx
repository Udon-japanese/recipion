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
	const undo = vi.fn(async () => ({ status: "undone" as const, items: [] }));

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

		expect(screen.queryByRole("button", { name: /作った/u })).toBeNull();
	});

	it("押すとすぐに在庫から引き、足りない分はある分だけ引き、少々は減らさない", async () => {
		const user = userEvent.setup();
		const { consume } = setup();

		await user.click(screen.getByRole("button", { name: /作った/u }));

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

		await user.click(screen.getByRole("button", { name: /作った/u }));

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

	it("元に戻すと、同じ操作の印で取り消す", async () => {
		const user = userEvent.setup();
		const { consume, undo } = setup();

		await user.click(screen.getByRole("button", { name: /作った/u }));
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

		await user.click(screen.getByRole("button", { name: /作った/u }));

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

		await user.click(screen.getByRole("button", { name: /作った/u }));
		await user.click(await screen.findByRole("button", { name: "元に戻す" }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"元に戻せませんでした",
		);
		expect(screen.getByRole("button", { name: "元に戻す" })).toBeEnabled();
	});
});
