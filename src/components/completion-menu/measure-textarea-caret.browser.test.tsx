import { afterEach, expect, test } from "vitest";
import { measureTextareaCaret } from "./measure-textarea-caret";

const created: HTMLElement[] = [];

// 幅・字体・余白を決めた、レイアウトの確認用の入力欄（等幅なので、文字の幅を計算できる）。
function createTextarea(value: string): HTMLTextAreaElement {
	const textarea = document.createElement("textarea");

	textarea.style.cssText =
		"position:absolute;top:50px;left:30px;width:200px;height:100px;box-sizing:border-box;padding:10px;border:2px solid black;font:16px/20px monospace;overflow:auto;resize:none;";
	textarea.value = value;
	document.body.appendChild(textarea);
	created.push(textarea);

	return textarea;
}

function characterWidth(): number {
	const canvas = document.createElement("canvas").getContext("2d");

	if (!canvas) {
		throw new Error("canvas が使えるはず");
	}

	canvas.font = "16px monospace";

	return canvas.measureText("a").width;
}

// 文字の箱と行の高さの違いで、1ピクセルほどずれるので、1ピクセルまで許す。
function expectNear(actual: number, expected: number) {
	expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1);
}

afterEach(() => {
	for (const element of created.splice(0)) {
		element.remove();
	}
});

// 枠（2px）と余白（10px）を足した、文字が始まる位置。
const origin = 12;

test("先頭は、余白の分だけ内側。文字を打つと、その幅だけ右へ進む", () => {
	const textarea = createTextarea("abc");

	const start = measureTextareaCaret(textarea, 0);

	expectNear(start.top, origin);
	expectNear(start.left, origin);
	expect(start.height).toBe(20);

	const after = measureTextareaCaret(textarea, 3);

	expectNear(after.top, origin);
	expectNear(after.left, origin + 3 * characterWidth());
});

test("改行のあとは、1行分だけ下がる", () => {
	const textarea = createTextarea("abc\nde");
	const caret = measureTextareaCaret(textarea, 6);

	expectNear(caret.top, origin + 20);
	expectNear(caret.left, origin + 2 * characterWidth());
});

test("長い文章が折り返したら、折り返した行に位置が移る", () => {
	// 1行に入る文字数（幅 200 − 枠 4 − 余白 20 = 176px）より長くする。
	const text = "a".repeat(40);
	const textarea = createTextarea(text);
	const perLine = Math.floor(176 / characterWidth());
	const caret = measureTextareaCaret(textarea, 40);

	expectNear(caret.top, origin + 20 * Math.floor(40 / perLine));
});

test("スクロールした分だけ、位置が上がる", () => {
	const textarea = createTextarea(
		Array.from({ length: 20 }, () => "a").join("\n"),
	);

	textarea.scrollTop = 40;

	expectNear(
		measureTextareaCaret(textarea, textarea.value.length).top,
		origin + 19 * 20 - 40,
	);
});

test("カーソルの後ろに、何行も文章が続いていても、位置は変わらない", () => {
	const textarea = createTextarea(
		`ab\n${Array.from({ length: 4 }, () => "cd").join("\n")}`,
	);
	const caret = measureTextareaCaret(textarea, 1);

	expectNear(caret.top, origin);
	expectNear(caret.left, origin + characterWidth());
	expect(caret.height).toBe(20);

	// 2行目の先頭でも、同じ。
	expectNear(measureTextareaCaret(textarea, 3).top, origin + 20);
});
