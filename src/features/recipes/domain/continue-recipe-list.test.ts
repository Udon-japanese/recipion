import { describe, expect, it } from "vitest";

import {
	continueRecipeList,
	removeRecipeListMarker,
	renumberRecipeList,
} from "./continue-recipe-list";

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

describe("removeRecipeListMarker", () => {
	// 「|」の位置にカーソルがあるときの、Backspace のあとの本文と、カーソルの位置。印の直後でなければ null。
	function backspaceAt(marked: string) {
		const caret = marked.indexOf("|");
		const text = marked.replace("|", "");
		const result = removeRecipeListMarker(text, caret, caret);

		return result && { text: result.text, caret: result.caret };
	}

	it("印の直後なら、印と空白を、一度に消す", () => {
		expect(backspaceAt("1. 混ぜる\n2. |")).toEqual({
			text: "1. 混ぜる\n",
			caret: 7,
		});
		expect(backspaceAt("9) |")).toEqual({ text: "", caret: 0 });
		expect(backspaceAt("３、 |")).toEqual({ text: "", caret: 0 });
		expect(backspaceAt("・|")).toBeNull();
		expect(backspaceAt("・ |")).toEqual({ text: "", caret: 0 });
		expect(backspaceAt("- |")).toEqual({ text: "", caret: 0 });
		expect(backspaceAt("1.  |")).toEqual({ text: "", caret: 0 });
	});

	it("印の後ろに文字があっても、印だけを消す。字下げは残す", () => {
		expect(backspaceAt("2. |混ぜる")).toEqual({ text: "混ぜる", caret: 0 });
		expect(backspaceAt("  2. |混ぜる")).toEqual({
			text: "  混ぜる",
			caret: 2,
		});
	});

	it("印の直後でなければ、ふつうの削除（null）", () => {
		// 空白のない印、印の途中、文字の後ろ、行の途中
		expect(backspaceAt("1.|")).toBeNull();
		expect(backspaceAt("1|. 混ぜる")).toBeNull();
		expect(backspaceAt("1. 混ぜ|る")).toBeNull();
		expect(backspaceAt("混ぜる 2. |")).toBeNull();
		expect(backspaceAt("1 1/2本 |")).toBeNull();
		expect(backspaceAt("|")).toBeNull();
	});

	it("範囲を選んでいるときは、ふつうの削除（null）", () => {
		expect(removeRecipeListMarker("1. 混ぜる", 0, 3)).toBeNull();
	});
});

describe("renumberRecipeList", () => {
	// 「|」の位置にカーソルがある、削除のあとの本文を、振り直す。
	function renumber(before: string, marked: string) {
		const caret = marked.indexOf("|");
		const text = marked.replace("|", "");
		const result = renumberRecipeList(before, { text, caret });

		return (
			result &&
			`${result.text.slice(0, result.caret)}|${result.text.slice(result.caret)}`
		);
	}

	const before = "1. a\n2. b\n3. c\n4. d";

	it("途中の行を消すと、後ろの番号を詰める", () => {
		expect(renumber(before, "1. a\n|3. c\n4. d")).toBe("1. a\n|2. c\n3. d");
	});

	it("先頭の行を消すと、1から振り直す", () => {
		expect(renumber(before, "|2. b\n3. c\n4. d")).toBe("|1. b\n2. c\n3. d");
	});

	it("末尾の行を消すときは、何もしない", () => {
		expect(renumber(before, "1. a\n2. b\n3. c|")).toBeNull();
	});

	it("桁が減るときは、カーソルの位置も合わせる", () => {
		const long = Array.from({ length: 11 }, (_, i) => `${i + 1}. x`).join("\n");
		const after = long.replace("1. x\n", "");
		const result = renumberRecipeList(long, {
			text: after,
			caret: after.length,
		});

		expect(result?.text).toBe(
			Array.from({ length: 10 }, (_, i) => `${i + 1}. x`).join("\n"),
		);
		expect(result?.caret).toBe(result?.text.length);
	});

	it("別の並び（ほかの区切り・離れた並び）は、触らない", () => {
		expect(renumber("1. a\n2. b\n3) x\n4) y", "1. a\n|3) x\n4) y")).toBeNull();
		expect(renumber("1. a\n2. b\n\n5. c", "1. a\n|\n5. c")).toBeNull();
	});

	it("削除でない編集は、何もしない", () => {
		expect(renumber("1. a\n3. c", "1. a\n2. |3. c")).toBeNull();
	});
});
