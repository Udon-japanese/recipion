import { describe, expect, it } from "vitest";

import { continueRecipeList } from "./continue-recipe-list";

// カーソルが末尾にあるときの、Enter のあとの本文。印を付けない行は null。
function enterAtEnd(text: string): string | null {
	return continueRecipeList(text, text.length, text.length)?.text ?? null;
}

describe("continueRecipeList", () => {
	it("番号の行の次に、1つ増やした番号を付ける", () => {
		expect(enterAtEnd("1. 混ぜる")).toBe("1. 混ぜる\n2. ");
		expect(enterAtEnd("9) 混ぜる")).toBe("9) 混ぜる\n10) ");
		expect(enterAtEnd("3、混ぜる")).toBe("3、混ぜる\n4、");
		expect(enterAtEnd("１．混ぜる")).toBe("１．混ぜる\n2．");
	});

	it("中黒などの印の行の次に、同じ印を付ける", () => {
		expect(enterAtEnd("・玉ねぎを切る")).toBe("・玉ねぎを切る\n・");
		expect(enterAtEnd("- 玉ねぎを切る")).toBe("- 玉ねぎを切る\n- ");
	});

	it("印のない行は、ふつうの改行（null）", () => {
		expect(enterAtEnd("玉ねぎを切る")).toBeNull();
		expect(enterAtEnd("卵 1個")).toBeNull();
		// 分量（1/2、1個）を、番号とみなさない
		expect(enterAtEnd("1/2個")).toBeNull();
		expect(enterAtEnd("2個")).toBeNull();
		expect(enterAtEnd("")).toBeNull();
	});

	it("印だけの行で Enter を押すと、印を消す", () => {
		const text = "1. 混ぜる\n2. ";

		expect(continueRecipeList(text, text.length, text.length)).toEqual({
			text: "1. 混ぜる\n",
			caret: 7,
		});
		expect(enterAtEnd("・")).toBe("");
	});

	it("行の途中で Enter を押すと、残りの文字に印が付く", () => {
		const text = "1. 混ぜて焼く";
		const result = continueRecipeList(text, 6, 6);

		expect(result).toEqual({ text: "1. 混ぜて\n2. 焼く", caret: 10 });
	});

	it("印より前にカーソルがあるとき、範囲を選んでいるときは、ふつうの改行", () => {
		expect(continueRecipeList("1. 混ぜる", 1, 1)).toBeNull();
		expect(continueRecipeList("1. 混ぜる", 3, 5)).toBeNull();
	});

	it("複数行の本文の、カーソルのある行だけを見る", () => {
		const text = "＜作り方＞\n1. 混ぜる\n2. 焼く\n\n＜メモ＞";
		const caret = text.indexOf("焼く") + 2;

		expect(continueRecipeList(text, caret, caret)?.text).toBe(
			"＜作り方＞\n1. 混ぜる\n2. 焼く\n3. \n\n＜メモ＞",
		);
	});
});
