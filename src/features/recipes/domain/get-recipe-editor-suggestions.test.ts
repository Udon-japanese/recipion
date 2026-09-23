import { describe, expect, it } from "vitest";

import { getRecipeEditorSuggestions } from "./get-recipe-editor-suggestions";
import { parseRecipeIngredients } from "./parse-recipe-ingredients";

describe("getRecipeEditorSuggestions", () => {
	const ingredients = parseRecipeIngredients(`
		肉だね
		豚ひき肉 200g
		玉ねぎ 1/2個
		卵 1個
		Aしょうゆ 大さじ1
		A砂糖 小さじ1
	`);

	it("材料名とグループ名を候補にする", () => {
		expect(getRecipeEditorSuggestions(ingredients)).toEqual([
			{
				type: "group",
				label: "肉だね",
			},
			{
				type: "ingredient",
				label: "豚ひき肉",
			},
			{
				type: "ingredient",
				label: "玉ねぎ",
			},
			{
				type: "ingredient",
				label: "卵",
			},
			{
				type: "group",
				label: "A",
			},
			{
				type: "ingredient",
				label: "しょうゆ",
			},
			{
				type: "ingredient",
				label: "砂糖",
			},
		]);
	});

	it("入力中の文字で候補を絞り込む", () => {
		expect(getRecipeEditorSuggestions(ingredients, "玉")).toEqual([
			{
				type: "ingredient",
				label: "玉ねぎ",
			},
		]);
	});

	it("全角半角と英字の大文字小文字を区別しない", () => {
		expect(getRecipeEditorSuggestions(ingredients, "ａ")).toEqual([
			{
				type: "group",
				label: "A",
			},
		]);
	});

	it("同じ名前を重複して候補に出さない", () => {
		const duplicatedIngredients = parseRecipeIngredients(`
			卵 1個
			卵 2個
		`);

		expect(getRecipeEditorSuggestions(duplicatedIngredients)).toEqual([
			{
				type: "ingredient",
				label: "卵",
			},
		]);
	});
});
