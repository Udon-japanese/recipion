import { describe, expect, it } from "vitest";
import {
	editKindOfInput,
	emptyTextHistory,
	recordEdit,
	redoEdit,
	type TextHistory,
	type TextSnapshot,
	undoEdit,
} from "./text-history";

const at = (text: string, caret = text.length): TextSnapshot => ({
	text,
	caret,
});

// 1文字ずつ入力した履歴（時刻は、100ミリ秒おき）。
function typeCharacters(
	history: TextHistory,
	characters: string,
	startAt = 0,
): TextHistory {
	let current = history;
	let text = "";

	[...characters].forEach((character, index) => {
		const before = at(text);

		text += character;
		current = recordEdit(
			current,
			before,
			at(text),
			"insert",
			startAt + index * 100,
		);
	});

	return current;
}

describe("recordEdit / undoEdit / redoEdit", () => {
	it("連続した入力は、まとめて1回で戻る", () => {
		const history = typeCharacters(emptyTextHistory, "abc");

		expect(history.past).toEqual([at("")]);
		expect(undoEdit(history, at("abc"))?.snapshot).toEqual(at(""));
	});

	it("時間が空くか、カーソルが動いたら、別の1回になる", () => {
		const slow = recordEdit(
			typeCharacters(emptyTextHistory, "ab"),
			at("ab"),
			at("abc"),
			"insert",
			5000,
		);
		const moved = recordEdit(
			typeCharacters(emptyTextHistory, "ab"),
			at("ab", 0),
			at("cab", 1),
			"insert",
			300,
		);

		expect(slow.past).toEqual([at(""), at("ab")]);
		expect(moved.past).toEqual([at(""), at("ab", 0)]);
	});

	it("入力と削除、補完などの、ほかの編集は、別々に戻る", () => {
		let history = typeCharacters(emptyTextHistory, "ab");

		history = recordEdit(history, at("ab"), at("a"), "delete", 250);
		history = recordEdit(history, at("a"), at("ａ"), "other", 300);
		history = recordEdit(history, at("ａ"), at("ａｂ"), "other", 310);

		expect(history.past.map((snapshot) => snapshot.text)).toEqual([
			"",
			"ab",
			"a",
			"ａ",
		]);
	});

	it("本文が変わらない編集は、記録しない", () => {
		const history = recordEdit(
			emptyTextHistory,
			at("a"),
			at("a", 0),
			"other",
			0,
		);

		expect(history).toBe(emptyTextHistory);
	});

	it("元に戻して、やり直せる。新しい編集をすると、やり直しは消える", () => {
		let history = recordEdit(emptyTextHistory, at(""), at("a"), "other", 0);
		history = recordEdit(history, at("a"), at("ab"), "other", 10);

		const undone = undoEdit(history, at("ab"));
		const redone = undone && redoEdit(undone.history, undone.snapshot);

		expect(undone?.snapshot).toEqual(at("a"));
		expect(redone?.snapshot).toEqual(at("ab"));
		expect(
			recordEdit(
				undone?.history ?? emptyTextHistory,
				at("a"),
				at("ac"),
				"other",
				20,
			).future,
		).toEqual([]);
	});

	it("戻せるものがなければ、null", () => {
		expect(undoEdit(emptyTextHistory, at("a"))).toBeNull();
		expect(redoEdit(emptyTextHistory, at("a"))).toBeNull();
	});

	it("元に戻したあとの入力は、前の入力とまとめない", () => {
		const history = typeCharacters(emptyTextHistory, "ab");
		const undone = undoEdit(history, at("ab"));

		expect(undone?.history.lastEdit).toBeNull();
	});
});

describe("editKindOfInput", () => {
	it("入力の種類から、編集の種類を決める", () => {
		expect(editKindOfInput("insertText")).toBe("insert");
		expect(editKindOfInput("deleteContentBackward")).toBe("delete");
		expect(editKindOfInput("insertFromPaste")).toBe("other");
		expect(editKindOfInput(undefined)).toBe("other");
	});
});
