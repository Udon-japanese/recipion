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

	it("割合が1、または数量のない材料は、そのまま", () => {
		const plain = need(null, null, "適量");

		expect(scaleRecipeNeed(plain, 0.5)).toBe(plain);
		expect(scaleRecipeNeed(need(2, "個", "2個"), 1)).toEqual(
			need(2, "個", "2個"),
		);
	});
});
