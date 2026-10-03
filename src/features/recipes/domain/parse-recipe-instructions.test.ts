import { describe, expect, it } from "vitest";

import { parseRecipeInstructions } from "./parse-recipe-instructions";

describe("parseRecipeInstructions", () => {
	it.each([
		[
			`
				1. 玉ねぎを切る
				2. フライパンで炒める
				3. 卵を加える
			`,
		],
		[
			`
				１．玉ねぎを切る
				２：フライパンで炒める
				３）卵を加える
			`,
		],
		[
			`
				①玉ねぎを切る
				②フライパンで炒める
				③卵を加える
			`,
		],
	])("一般的な工程番号を除去する", (input) => {
		expect(parseRecipeInstructions(input)).toEqual([
			"玉ねぎを切る",
			"フライパンで炒める",
			"卵を加える",
		]);
	});

	it("番号だけの行と本文を結合する", () => {
		expect(
			parseRecipeInstructions(`
				1
				玉ねぎを切る
				2
				フライパンで炒める
				3
				卵を加える
			`),
		).toEqual(["玉ねぎを切る", "フライパンで炒める", "卵を加える"]);
	});

	it("番号付き工程の途中にある改行は同じ工程へ結合する", () => {
		expect(
			parseRecipeInstructions(`
				1. フライパンに油を入れて玉ねぎを炒める
				透き通るまで弱火で加熱する
				2. 卵を加える
				全体を大きく混ぜる
			`),
		).toEqual([
			"フライパンに油を入れて玉ねぎを炒める\n透き通るまで弱火で加熱する",
			"卵を加える\n全体を大きく混ぜる",
		]);
	});

	it("箇条書き記号を除去する", () => {
		expect(
			parseRecipeInstructions(`
				・玉ねぎを切る
				・フライパンで炒める
				・卵を加える
			`),
		).toEqual(["玉ねぎを切る", "フライパンで炒める", "卵を加える"]);
	});

	it("番号がない場合は1行を1工程として扱う", () => {
		expect(
			parseRecipeInstructions(`
				玉ねぎを切る
				フライパンで炒める
				卵を加える
			`),
		).toEqual(["玉ねぎを切る", "フライパンで炒める", "卵を加える"]);
	});

	it.each([
		"180℃に予熱する",
		"2等分する",
		"10分加熱する",
	])("工程内容に含まれる数値は削除しない: %s", (instruction) => {
		expect(parseRecipeInstructions(instruction)).toEqual([instruction]);
	});

	it("空行だけなら空配列を返す", () => {
		expect(parseRecipeInstructions("　\n\n ")).toEqual([]);
	});
});
