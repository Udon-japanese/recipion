import { describe, expect, it } from "vitest";

import { parseRecipeIngredients } from "./parse-recipe-ingredients";

describe("parseRecipeIngredients", () => {
	it("1行に書かれた複数の材料を解析する", () => {
		expect(
			parseRecipeIngredients(`
				卵 1個
				牛乳 200ml
			`),
		).toEqual([
			expect.objectContaining({
				type: "ingredient",
				status: "parsed",
				name: "卵",
				amountText: "1個",
				quantity: 1,
				unitLabel: "個",
			}),
			expect.objectContaining({
				type: "ingredient",
				status: "parsed",
				name: "牛乳",
				amountText: "200ml",
				quantity: 200,
				unitLabel: "ml",
			}),
		]);
	});

	it("改行で分かれた食材名と使用量を結合する", () => {
		expect(
			parseRecipeIngredients(`
				薄力粉
				200g
				牛乳
				150ml
			`),
		).toEqual([
			expect.objectContaining({
				type: "ingredient",
				status: "parsed",
				rawText: "薄力粉\n200g",
				name: "薄力粉",
				amountText: "200g",
				quantity: 200,
				unitLabel: "g",
			}),
			expect.objectContaining({
				type: "ingredient",
				status: "parsed",
				rawText: "牛乳\n150ml",
				name: "牛乳",
				amountText: "150ml",
				quantity: 150,
				unitLabel: "ml",
			}),
		]);
	});

	it("使用量がない見出しの下に続く材料をグループ化する", () => {
		const result = parseRecipeIngredients(`
			肉だね
			豚ひき肉 200g
			玉ねぎ 1/2個
			卵 1個
			ソース
			しょうゆ 大さじ1
			砂糖 小さじ1
		`);

		expect(result).toEqual([
			expect.objectContaining({
				type: "group",
				name: "肉だね",
				inferred: true,
				children: [
					expect.objectContaining({
						name: "豚ひき肉",
						quantity: 200,
						unitLabel: "g",
					}),
					expect.objectContaining({
						name: "玉ねぎ",
						quantity: 0.5,
						unitLabel: "個",
					}),
					expect.objectContaining({
						name: "卵",
						quantity: 1,
						unitLabel: "個",
					}),
				],
			}),
			expect.objectContaining({
				type: "group",
				name: "ソース",
				inferred: true,
				children: [
					expect.objectContaining({
						name: "しょうゆ",
						quantity: 1,
						unitLabel: "大さじ",
					}),
					expect.objectContaining({
						name: "砂糖",
						quantity: 1,
						unitLabel: "小さじ",
					}),
				],
			}),
		]);
	});

	it("使用量のない行が連続する場合は勝手に親子関係を作らない", () => {
		expect(
			parseRecipeIngredients(`
				塩
				こしょう
			`),
		).toEqual([
			expect.objectContaining({
				type: "ingredient",
				status: "missing-amount",
				name: "塩",
			}),
			expect.objectContaining({
				type: "ingredient",
				status: "missing-amount",
				name: "こしょう",
			}),
		]);
	});

	it("空行は無視する", () => {
		expect(
			parseRecipeIngredients(`


				卵 1個


			`),
		).toHaveLength(1);
	});

	it("空の文章は空配列を返す", () => {
		expect(parseRecipeIngredients("　\n ")).toEqual([]);
	});
});
