import { describe, expect, it } from "vitest";

import { parseRecipePreparations } from "./parse-recipe-preparations";

describe("parseRecipePreparations", () => {
	it("1行を1件の下準備として扱う", () => {
		expect(
			parseRecipePreparations(`
				玉ねぎはみじん切りにする
				卵は溶いておく
				オーブンを180℃に予熱する
			`),
		).toEqual([
			"玉ねぎはみじん切りにする",
			"卵は溶いておく",
			"オーブンを180℃に予熱する",
		]);
	});

	it("一般的なチェック記号と箇条書き記号を除去する", () => {
		expect(
			parseRecipePreparations(`
				□ 玉ねぎはみじん切りにする
				☐ 卵は溶いておく
				- オーブンを180℃に予熱する
			`),
		).toEqual([
			"玉ねぎはみじん切りにする",
			"卵は溶いておく",
			"オーブンを180℃に予熱する",
		]);
	});

	it("箇条書き項目内の改行を同じ下準備へ結合する", () => {
		expect(
			parseRecipePreparations(`
				・玉ねぎはみじん切りにする
				水にさらして水気を切る
				・卵は溶いておく
			`),
		).toEqual([
			"玉ねぎはみじん切りにする\n水にさらして水気を切る",
			"卵は溶いておく",
		]);
	});

	it("本文の表記を勝手に正規化しない", () => {
		expect(parseRecipePreparations("オーブンを180℃に予熱する")).toEqual([
			"オーブンを180℃に予熱する",
		]);
	});

	it("空の文章は空配列を返す", () => {
		expect(parseRecipePreparations("　\n ")).toEqual([]);
	});
});
