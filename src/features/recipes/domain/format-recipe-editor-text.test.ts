import { describe, expect, it } from "vitest";
import {
	formatInstructionText,
	formatPreparationText,
	formatRecipeEditorText,
	formatRecipeTemplateText,
} from "./format-recipe-editor-text";
import { parseRecipeIngredients } from "./parse-recipe-ingredients";
import { parseRecipeInstructions } from "./parse-recipe-instructions";
import { parseRecipePreparations } from "./parse-recipe-preparations";
import { splitRecipeSections } from "./split-recipe-sections";

describe("formatPreparationText", () => {
	it("読み戻すと、複数行の項目を含めて、元の下準備に戻る", () => {
		const preparations = [
			{ text: "玉ねぎをみじん切りにする" },
			{ text: "卵を溶いておく\n常温に戻しておく" },
			{ text: "200gを量る" },
		];

		expect(
			parseRecipePreparations(formatPreparationText(preparations)),
		).toEqual(preparations.map((preparation) => preparation.text));
	});

	it("下準備がなければ、空の文字列にする", () => {
		expect(formatPreparationText([])).toBe("");
	});
});

describe("formatInstructionText", () => {
	it("読み戻すと、複数行の項目や数字で始まる項目を含めて、元の作り方に戻る", () => {
		const instructions = [
			{ text: "材料を混ぜる" },
			{ text: "フライパンで焼く\n途中で裏返す" },
			{ text: "200gずつに分ける" },
		];

		expect(
			parseRecipeInstructions(formatInstructionText(instructions)),
		).toEqual(instructions.map((instruction) => instruction.text));
	});

	it("作り方がなければ、空の文字列にする", () => {
		expect(formatInstructionText([])).toBe("");
	});
});

describe("formatRecipeEditorText", () => {
	const document = {
		ingredients: [
			{ type: "ingredient", name: "卵", amountText: "1個" },
			{
				type: "group",
				name: "☆ソース",
				children: [
					{ type: "ingredient", name: "ケチャップ", amountText: "大さじ2" },
				],
			},
			{
				type: "group",
				name: "トッピング",
				children: [{ type: "ingredient", name: "海苔", amountText: "適量" }],
			},
		],
		preparations: [{ text: "玉ねぎを切る" }],
		instructions: [{ text: "混ぜる" }, { text: "焼く" }],
		note: "冷凍もできる",
	} as const;

	it("見出しつきの1つの文章にする", () => {
		expect(formatRecipeEditorText(document)).toBe(`＜材料＞
卵 1個
☆ソース
ケチャップ 大さじ2
☆トッピング
海苔 適量

＜下準備＞
- 玉ねぎを切る

＜作り方＞
1. 混ぜる
2. 焼く

＜メモ＞
冷凍もできる`);
	});

	it("書き戻した文章を分けて読み直すと、元の内容に戻る", () => {
		const sections = splitRecipeSections(formatRecipeEditorText(document));

		expect(parseRecipePreparations(sections.preparationText)).toEqual([
			"玉ねぎを切る",
		]);
		expect(parseRecipeInstructions(sections.instructionText)).toEqual([
			"混ぜる",
			"焼く",
		]);
		expect(sections.note).toBe("冷凍もできる");
		expect(
			parseRecipeIngredients(sections.ingredientText).map((node) => node.type),
		).toEqual(["ingredient", "group", "group"]);
	});

	it("新規登録の雛形は、見出しだけになる", () => {
		expect(formatRecipeTemplateText()).toBe(
			"＜材料＞\n\n＜下準備＞\n\n＜作り方＞\n\n＜メモ＞\n",
		);
	});
});
