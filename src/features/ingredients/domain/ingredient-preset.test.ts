import { describe, expect, it } from "vitest";
import {
	eggIngredientPreset,
	findIngredientPreset,
	milkIngredientPreset,
} from "./ingredient-preset";

describe("findIngredientPreset", () => {
	it.each([
		"卵",
		"たまご",
		"タマゴ",
		"玉子",
	])("%sを卵として解決する", (alias) => {
		expect(findIngredientPreset(alias)).toBe(eggIngredientPreset);
	});

	it.each([
		"牛乳",
		"ぎゅうにゅう",
		"ギュウニュウ",
		"ミルク",
		"MILK",
	])("%sを牛乳として解決する", (alias) => {
		expect(findIngredientPreset(alias)).toBe(milkIngredientPreset);
	});

	it("NFKCと小文字化を適用して検索する", () => {
		expect(findIngredientPreset("  ＭＩＬＫ  ")).toBe(milkIngredientPreset);
	});

	it("未知の食材ではundefinedを返す", () => {
		expect(findIngredientPreset("ドラゴンフルーツ")).toBeUndefined();
	});

	it("空文字ではundefinedを返す", () => {
		expect(findIngredientPreset("　 ")).toBeUndefined();
	});
});
