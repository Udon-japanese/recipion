import { describe, expect, it } from "vitest";
import {
	getItemCategoryOrder,
	isItemCategoryId,
	itemCategories,
} from "./item-category";

describe("itemCategories", () => {
	it("標準の売り場順を維持する", () => {
		expect(itemCategories.map((category) => category.id)).toEqual([
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
		const categoryIds = itemCategories.map((category) => category.id);

		expect(new Set(categoryIds).size).toBe(categoryIds.length);
	});

	it("既知のカテゴリIDを判定できる", () => {
		expect(isItemCategoryId("dairy")).toBe(true);
		expect(isItemCategoryId("eggs")).toBe(true);
		expect(isItemCategoryId("dairy-eggs")).toBe(false);
	});

	it("標準的な売り場順を返す", () => {
		expect(getItemCategoryOrder("produce")).toBeLessThan(
			getItemCategoryOrder("meat"),
		);
		expect(getItemCategoryOrder("meat")).toBeLessThan(
			getItemCategoryOrder("frozen"),
		);

		expect(getItemCategoryOrder("dairy")).toBeLessThan(
			getItemCategoryOrder("eggs"),
		);
	});

	it("カテゴリ未設定の商品は最後にする", () => {
		expect(getItemCategoryOrder(null)).toBe(itemCategories.length);
	});
});
