import { describe, expect, it } from "vitest";
import {
	getShoppingCategoryOrder,
	isShoppingCategoryId,
	shoppingCategories,
} from "./shopping-category";

describe("shoppingCategories", () => {
	it("標準の売り場順を維持する", () => {
		expect(shoppingCategories.map((category) => category.id)).toEqual([
			"produce",
			"chilled",
			"household",
			"meat",
			"seafood",
			"dairy",
			"eggs",
			"pantry",
			"frozen",
			"snacks",
			"staples",
			"beverages",
			"deli",
			"bakery",
			"other",
		]);
	});
	it("カテゴリIDが重複していない", () => {
		const categoryIds = shoppingCategories.map((category) => category.id);

		expect(new Set(categoryIds).size).toBe(categoryIds.length);
	});

	it("既知のカテゴリIDを判定できる", () => {
		expect(isShoppingCategoryId("dairy")).toBe(true);
		expect(isShoppingCategoryId("eggs")).toBe(true);
		expect(isShoppingCategoryId("dairy-eggs")).toBe(false);
	});

	it("標準的な売り場順を返す", () => {
		expect(getShoppingCategoryOrder("produce")).toBeLessThan(
			getShoppingCategoryOrder("meat"),
		);
		expect(getShoppingCategoryOrder("meat")).toBeLessThan(
			getShoppingCategoryOrder("frozen"),
		);

		expect(getShoppingCategoryOrder("dairy")).toBeLessThan(
			getShoppingCategoryOrder("eggs"),
		);
	});

	it("カテゴリ未設定の商品は最後にする", () => {
		expect(getShoppingCategoryOrder(null)).toBe(shoppingCategories.length);
	});
});
