import { describe, expect, it } from "vitest";

import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";

import {
	getShoppingItemPresets,
	inferShoppingCategory,
	shoppingItemSuggestions,
} from "./shopping-item-suggestion";

describe.each(
	shoppingItemSuggestions,
)("買い物候補: $categoryId", (suggestion) => {
	it.each(suggestion.aliases)("%sから同じ数量候補を取得できる", (alias) => {
		expect(getShoppingItemPresets(alias)).toEqual(suggestion.presets);
	});

	it.each(suggestion.aliases)("%sを設定されたカテゴリに分類する", (alias) => {
		expect(inferShoppingCategory(alias)).toBe(suggestion.categoryId);
	});

	it("正規化後の別名が重複していない", () => {
		const normalizedAliases = suggestion.aliases.map(normalizeIngredientName);

		expect(new Set(normalizedAliases).size).toBe(normalizedAliases.length);
	});

	it("すべての数量候補が有効な値を持つ", () => {
		for (const preset of suggestion.presets) {
			expect(preset.label.length).toBeGreaterThan(0);
			expect(preset.quantity).toBeGreaterThan(0);
			expect(preset.unitLabel.length).toBeGreaterThan(0);
			expect(preset.inventoryConversion.inputUnitCode.length).toBeGreaterThan(
				0,
			);
			expect(
				preset.inventoryConversion.stockQuantityPerInputUnit,
			).toBeGreaterThan(0);
		}
	});
});

describe("買い物候補の正規化", () => {
	it.each([
		"milk",
		"Milk",
		"MILK",
		"mILK",
		"ＭｉＬＫ",
	])("英字の大文字小文字に関係なく%sを牛乳として扱う", (name) => {
		expect(inferShoppingCategory(name)).toBe("dairy");
	});

	it("Unicode表現と前後の空白を正規化する", () => {
		expect(inferShoppingCategory("  タマゴ  ")).toBe("eggs");
	});
});

describe("未登録の商品", () => {
	it("数量候補を返さない", () => {
		expect(getShoppingItemPresets("謎の商品")).toEqual([]);
	});

	it("カテゴリを推測しない", () => {
		expect(inferShoppingCategory("謎の商品")).toBeNull();
	});

	it("空の商品名を分類しない", () => {
		expect(inferShoppingCategory("　 ")).toBeNull();
	});
});
