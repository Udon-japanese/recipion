import { describe, expect, it } from "vitest";
import { filterRecipesByName } from "./filter-recipes-by-name";

const recipes = [
	{ name: "豚の生姜焼き" },
	{ name: "ハンバーグ" },
	{ name: "ＫＦＣ風チキン" },
];

describe("filterRecipesByName", () => {
	it("空の検索は、すべてを、そのままの順で返す", () => {
		expect(filterRecipesByName(recipes, "  ")).toEqual(recipes);
	});

	it("ひらがなとカタカナ、全角と半角、大文字と小文字の違いを気にしない", () => {
		expect(filterRecipesByName(recipes, "はんばーぐ")).toEqual([
			{ name: "ハンバーグ" },
		]);
		expect(filterRecipesByName(recipes, "kfc")).toEqual([
			{ name: "ＫＦＣ風チキン" },
		]);
	});

	it("空白で区切った語は、すべてを含むものだけ", () => {
		expect(filterRecipesByName(recipes, "豚 焼き")).toEqual([
			{ name: "豚の生姜焼き" },
		]);
		expect(filterRecipesByName(recipes, "豚 チキン")).toEqual([]);
	});
});
