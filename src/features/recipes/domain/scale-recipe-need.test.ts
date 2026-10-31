import { describe, expect, it } from "vitest";
import type { RecipeShoppingNeed } from "./plan-shopping-from-recipe";
import { scaleRecipeNeed } from "./scale-recipe-need";

function need(
	quantity: number | null,
	unitLabel: string | null,
	amountText: string | null,
): RecipeShoppingNeed {
	return { id: "1", name: "醤油", quantity, unitLabel, amountText };
}

describe("scaleRecipeNeed", () => {
	it("数量と分量の表示を、割合で掛ける", () => {
		expect(scaleRecipeNeed(need(3, "大さじ", "大さじ3"), 0.5)).toMatchObject({
			quantity: 1.5,
			amountText: "大さじ1と1/2",
		});
		expect(scaleRecipeNeed(need(200, "g", "200g"), 2)).toMatchObject({
			quantity: 400,
			amountText: "400g",
		});
	});

	it.each([
		[
			{ min: 60, max: 70 },
			"g",
			"60~70g",
			2,
			{ min: 120, max: 140 },
			"120~140g",
		],
		[
			{ min: 4, max: 5 },
			"大さじ",
			"大さじ4〜5",
			0.5,
			{ min: 2, max: 2.5 },
			"大さじ2~2と1/2",
		],
	])(
		"範囲（%o %s）は、下限と上限を掛け、表示も直す",
		(range, unitLabel, amountText, ratio, scaled, scaledText) => {
			expect(
				scaleRecipeNeed({ ...need(null, unitLabel, amountText), range }, ratio),
			).toMatchObject({
				quantity: null,
				range: scaled,
				amountText: scaledText,
			});
		},
	);

	it("割合が1、または数量のない材料は、そのまま", () => {
		const plain = need(null, null, "適量");

		expect(scaleRecipeNeed(plain, 0.5)).toBe(plain);
		expect(scaleRecipeNeed(need(2, "個", "2個"), 1)).toEqual(
			need(2, "個", "2個"),
		);
	});
});
