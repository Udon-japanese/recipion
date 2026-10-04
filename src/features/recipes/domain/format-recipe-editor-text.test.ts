import { describe, expect, it } from "vitest";
import {
	formatInstructionText,
	formatPreparationText,
} from "./format-recipe-editor-text";
import { parseRecipeInstructions } from "./parse-recipe-instructions";
import { parseRecipePreparations } from "./parse-recipe-preparations";

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
