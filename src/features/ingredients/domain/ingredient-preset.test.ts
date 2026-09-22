import { describe, expect, it } from "vitest";

import { inventoryUnitCodes } from "#/features/inventory/domain/inventory-unit";

import { findIngredientPreset, ingredientPresets } from "./ingredient-preset";
import { normalizeIngredientName } from "./normalize-ingredient-name";

describe.each(ingredientPresets)("食材プリセット: $id", (preset) => {
	it("主名称からプリセットを取得できる", () => {
		expect(findIngredientPreset(preset.name)).toBe(preset);
	});

	it.each(preset.aliases)("%sからプリセットを取得できる", (alias) => {
		expect(findIngredientPreset(alias)).toBe(preset);
	});

	it("正規化後の別名が重複していない", () => {
		const normalizedAliases = preset.aliases.map(normalizeIngredientName);

		expect(new Set(normalizedAliases).size).toBe(normalizedAliases.length);
	});

	it("有効な在庫設定を持つ", () => {
		expect(preset.name.length).toBeGreaterThan(0);
		expect(inventoryUnitCodes).toContain(preset.stockUnitCode);
		expect(preset.stockUnitLabel.length).toBeGreaterThan(0);
		expect(["exact", "estimated"]).toContain(preset.defaultTrackingMode);
	});
});

describe("食材プリセットの名前正規化", () => {
	it.each([
		["  ＭＩＬＫ  ", "milk"],
		["ＨＭ", "hotcake-mix"],
	])("NFKC・空白・大文字小文字を処理する: %s", (input, expectedId) => {
		expect(findIngredientPreset(input)?.id).toBe(expectedId);
	});
});

describe("未登録の食材", () => {
	it("未知の食材ではundefinedを返す", () => {
		expect(findIngredientPreset("ドラゴンフルーツ")).toBeUndefined();
	});

	it("空文字ではundefinedを返す", () => {
		expect(findIngredientPreset("　 ")).toBeUndefined();
	});
});
