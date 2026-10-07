import { describe, expect, it } from "vitest";

import {
	parseRecipeHeading,
	splitRecipeSections,
} from "./split-recipe-sections";

describe("parseRecipeHeading", () => {
	it("飾りのついた見出しを読み取る", () => {
		const headings = [
			"材料",
			"＜材料＞",
			"<材料>",
			"【材料】",
			"■材料",
			"[材料]",
			"材料:",
			"材料：",
			"＜ 材料 ＞",
		];
		const failed = headings.filter(
			(line) => parseRecipeHeading(line)?.kind !== "ingredients",
		);

		expect(failed).toEqual([]);
	});

	it("見出しの語を、種類に対応づける", () => {
		expect(parseRecipeHeading("＜下準備＞")?.kind).toBe("preparations");
		expect(parseRecipeHeading("下ごしらえ")?.kind).toBe("preparations");
		expect(parseRecipeHeading("<作り方>")?.kind).toBe("instructions");
		expect(parseRecipeHeading("手順")?.kind).toBe("instructions");
		expect(parseRecipeHeading("＜メモ＞")?.kind).toBe("note");
	});

	it("見出しの人数を読み取る", () => {
		expect(parseRecipeHeading("材料（2人分）")?.servings).toBe(2);
		expect(parseRecipeHeading("＜材料 ４人分＞")).toBeNull();
		expect(parseRecipeHeading("【材料】")?.servings).toBeNull();
	});

	it("見出しではない行は、読み取らない", () => {
		const lines = ["玉ねぎ 1個", "☆ソース", "材料を混ぜる", "1. 材料", "A"];

		expect(lines.filter((line) => parseRecipeHeading(line))).toEqual([]);
	});
});

describe("splitRecipeSections（見出しあり）", () => {
	it("見出しごとに、文章を分ける", () => {
		const result = splitRecipeSections(`＜材料＞
・豚ひき肉 200g
☆ソース
ケチャップ 大さじ2

＜下準備＞
- 玉ねぎをみじん切りにする

＜作り方＞
1. 材料を混ぜる
2. 焼く

＜メモ＞
冷凍もできる`);

		expect(result).toMatchObject({
			hasHeadings: true,
			ingredientText: "豚ひき肉 200g\n☆ソース\nケチャップ 大さじ2",
			preparationText: "- 玉ねぎをみじん切りにする",
			instructionText: "1. 材料を混ぜる\n2. 焼く",
			note: "冷凍もできる",
			unclassifiedBlocks: [],
		});
	});

	it("見出しだけで中身がなくてもよい", () => {
		const result = splitRecipeSections("＜材料＞\n\n＜作り方＞\n");

		expect(result).toMatchObject({
			hasHeadings: true,
			ingredientText: "",
			instructionText: "",
		});
	});

	it("最初の見出しより前の文章は、分類しない", () => {
		const result = splitRecipeSections("ハンバーグ\n\n材料\n卵 1個");

		expect(result.unclassifiedBlocks).toEqual(["ハンバーグ"]);
		expect(result.ingredientText).toBe("卵 1個");
	});

	it("見出しから人数を取り出す", () => {
		expect(splitRecipeSections("材料（4人分）\n卵 1個").servings).toBe(4);
	});
});

describe("splitRecipeSections（見出しなし）", () => {
	it("中黒ありでも、なしでも、分量のあるブロックを材料にする", () => {
		const withBullets = splitRecipeSections("・卵 1個\n・牛乳 200ml");
		const withoutBullets = splitRecipeSections("卵 1個\n牛乳 200ml");

		expect(withBullets.ingredientText).toBe("卵 1個\n牛乳 200ml");
		expect(withoutBullets.ingredientText).toBe("卵 1個\n牛乳 200ml");
	});

	it("名前だけの行も、分量のある行と同じブロックなら、材料にする", () => {
		const result = splitRecipeSections("卵 1個\n塩");

		expect(result.ingredientText).toBe("卵 1個\n塩");
	});

	it("番号つきのブロックを、作り方にする", () => {
		const result = splitRecipeSections("1. 混ぜる\n2. 焼く");

		expect(result.instructionText).toBe("1. 混ぜる\n2. 焼く");
		expect(result.ingredientText).toBe("");
	});

	it("分量の読めない文章が続くブロックを、作り方にする", () => {
		const result = splitRecipeSections("玉ねぎを切る\n肉と混ぜる");

		expect(result.instructionText).toBe("玉ねぎを切る\n肉と混ぜる");
	});

	it("材料・作り方のブロックを、空行で区切って、まとめて貼れる", () => {
		const result = splitRecipeSections(`卵 1個
牛乳 200ml

1) 混ぜる
2) 焼く`);

		expect(result).toMatchObject({
			hasHeadings: false,
			ingredientText: "卵 1個\n牛乳 200ml",
			instructionText: "1) 混ぜる\n2) 焼く",
		});
	});

	it("分量のない短い1行は、決めない", () => {
		expect(splitRecipeSections("ハンバーグ").unclassifiedBlocks).toEqual([
			"ハンバーグ",
		]);
	});

	it("「1 1/2本」のような分量を、番号とみなさない", () => {
		expect(splitRecipeSections("ねぎ 1 1/2本").ingredientText).toBe(
			"ねぎ 1 1/2本",
		);
	});
});
