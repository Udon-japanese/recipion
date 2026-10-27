import { describe, expect, it } from "vitest";
import {
	collectMadeRecipeStock,
	planMadeRecipeConsumption,
} from "./made-recipe-stock";

const items = [
	{ inventoryItemId: "inv-dressing", quantity: 1.5, sourceRecipePublicId: "d" },
	{ inventoryItemId: "inv-onion", quantity: 3 },
	{ inventoryItemId: "inv-empty", quantity: 0, sourceRecipePublicId: "e" },
	{
		inventoryItemId: "inv-presence",
		quantity: 1,
		trackingMode: "presence",
		sourceRecipePublicId: "p",
	},
];

describe("collectMadeRecipeStock", () => {
	it("在庫のあるできあがり（作り置き）だけを、元のレシピごとに集める", () => {
		expect([...collectMadeRecipeStock(items)]).toEqual([["d", 1.5]]);
	});
});

describe("planMadeRecipeConsumption", () => {
	it("使う分を、できあがりの在庫から引く行にする（材料の行ではない）", () => {
		const [row, ...rest] = planMadeRecipeConsumption(
			[{ publicId: "d", name: "和風ドレッシング", quantity: 0.5 }],
			items,
		);

		expect(rest).toEqual([]);
		expect(row).toMatchObject({
			status: "consume",
			deduct: 0.5,
			target: {
				inventoryItemId: "inv-dressing",
				stockUnitCode: "count",
				stockUnitLabel: "回分",
			},
		});
		expect(row?.need.id).toBe("made/d");
	});

	it("在庫の食材がない、使う量が0のものは、行にしない", () => {
		expect(
			planMadeRecipeConsumption(
				[
					{ publicId: "x", name: "なし", quantity: 1 },
					{ publicId: "d", name: "和風ドレッシング", quantity: 0 },
				],
				items,
			),
		).toEqual([]);
	});
});
