import { describe, expect, it } from "vitest";

import { parseRecipeIngredientLine } from "./parse-recipe-ingredient-line";

describe("parseRecipeIngredientLine", () => {
	it.each([
		["卵 1個", "卵", "1個", 1, "個"],
		["卵　1個", "卵", "1個", 1, "個"],
		["卵:1個", "卵", "1個", 1, "個"],
		["卵：1個", "卵", "1個", 1, "個"],
		["卵1個", "卵", "1個", 1, "個"],
		["牛乳200ml", "牛乳", "200ml", 200, "ml"],
		["しょうゆ 大さじ1", "しょうゆ", "大さじ1", 1, "大さじ"],
		["砂糖：小さじ1/2", "砂糖", "小さじ1/2", 0.5, "小さじ"],
		["玉ねぎ 1/2個", "玉ねぎ", "1/2個", 0.5, "個"],
		["だし 1 1/2カップ", "だし", "1 1/2カップ", 1.5, "カップ"],
		["薄力粉 約200g", "薄力粉", "約200g", 200, "g"],
		["5枚切り食パン 1枚", "5枚切り食パン", "1枚", 1, "枚"],
	])("%sを食材名と使用量へ分割する", (input, name, amountText, quantity, unitLabel) => {
		expect(parseRecipeIngredientLine(input)).toEqual({
			status: "parsed",
			rawText: input,
			name,
			amountText,
			quantity,
			unitLabel,
		});
	});

	it.each([
		["塩 少々", "塩", "少々"],
		["パセリ 適量", "パセリ", "適量"],
		["こしょう お好みで", "こしょう", "お好みで"],
	])("%sの数値化できない使用量も保持する", (input, name, amountText) => {
		expect(parseRecipeIngredientLine(input)).toEqual({
			status: "parsed",
			rawText: input,
			name,
			amountText,
			quantity: null,
			unitLabel: amountText === "ひとつまみ" ? "ひとつまみ" : null,
		});
	});

	it("使用量がなければ未解析として食材名を保持する", () => {
		expect(parseRecipeIngredientLine("肉だね")).toEqual({
			status: "missing-amount",
			rawText: "肉だね",
			name: "肉だね",
			amountText: null,
			quantity: null,
			unitLabel: null,
		});
	});

	it("空行は無視する", () => {
		expect(parseRecipeIngredientLine("　 ")).toBeNull();
	});
});
