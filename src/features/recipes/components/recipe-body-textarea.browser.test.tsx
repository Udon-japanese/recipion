import { useState } from "react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { CompositionStrategy } from "../domain/choose-composition-strategy";
import { measureTextareaCaret } from "../infrastructure/measure-textarea-caret";
import { RecipeBodyTextarea } from "./recipe-body-textarea";

// 変換中の補完の方式は、実行する環境（OS・ブラウザ）で変わるので、テストでは、既定で明示する。
function Harness({
	compositionStrategy = "end-then-replace",
	completionLayout,
}: {
	compositionStrategy?: CompositionStrategy;
	completionLayout?: "caret" | "keyboard-bar";
}) {
	const [value, setValue] = useState("");

	return (
		<RecipeBodyTextarea
			value={value}
			onChange={setValue}
			recipeNames={["玉ねぎ"]}
			compositionStrategy={compositionStrategy}
			completionLayout={completionLayout}
		/>
	);
}

function getTextarea(): HTMLTextAreaElement {
	const textarea = document.querySelector("textarea");

	if (!textarea) {
		throw new Error("入力欄があるはず");
	}

	return textarea;
}

function textareaValue(): string {
	return getTextarea().value;
}

async function focusTextarea() {
	await userEvent.click(page.getByRole("textbox", { name: "レシピの本文" }));
}

const undoKeys = "{Control>}z{/Control}";
const redoKeys = "{Control>}{Shift>}z{/Shift}{/Control}";

// 元に戻す・やり直しは、自前の履歴で行う（本文を値として書き換えると、ブラウザの履歴は消えるため）。
// 自動で入れた番号は、1回で、入れる前に戻る。
test("番号の自動入力を、元に戻せる", async () => {
	await render(<Harness />);
	await focusTextarea();
	await userEvent.keyboard("1. 混ぜる{Enter}");

	expect(textareaValue()).toBe("1. 混ぜる\n2. ");

	await userEvent.keyboard(undoKeys);

	expect(textareaValue()).toBe("1. 混ぜる");

	await userEvent.keyboard(redoKeys);

	expect(textareaValue()).toBe("1. 混ぜる\n2. ");
});

test("補完で入れた文字を、元に戻せる（そのあと、入力も戻る）", async () => {
	await render(<Harness />);
	await focusTextarea();
	await userEvent.keyboard("＜作{Tab}");

	expect(textareaValue()).toBe("＜作り方＞\n");

	await userEvent.keyboard(undoKeys);

	expect(textareaValue()).toBe("＜作");

	await userEvent.keyboard(undoKeys);

	expect(textareaValue()).toBe("");
});

test("続けた入力は、1回で元に戻る", async () => {
	await render(<Harness />);
	await focusTextarea();
	await userEvent.keyboard("abc");
	await userEvent.keyboard(undoKeys);

	expect(textareaValue()).toBe("");
});

// 実際の IME の動作は、この環境では確かめられない。変換の開始・終了のイベントを作って、決定の流れを確かめる。
function startComposition() {
	getTextarea().dispatchEvent(
		new CompositionEvent("compositionstart", { bubbles: true }),
	);
}

function candidateButton() {
	const button = document.querySelector('[aria-label="補完の候補"] button');

	if (!button) {
		throw new Error("補完の候補があるはず");
	}

	return button;
}

test("変換中も候補を出し、押すと、変換の確定を待たずに置き換える（Chromium）", async () => {
	await render(<Harness />);
	await focusTextarea();
	startComposition();
	await userEvent.keyboard("＜作");

	await expect.poll(() => candidateButton().textContent).toBe("＜作り方＞");

	candidateButton().dispatchEvent(
		new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
	);

	await expect.poll(textareaValue).toBe("＜作り方＞\n");
	// 置き換えたあとも、入力欄にフォーカスがある。
	await expect.poll(() => document.activeElement).toBe(getTextarea());

	await userEvent.keyboard(undoKeys);

	// 元に戻すと、変換の確定した状態（変換中の文字）に戻る。
	expect(textareaValue()).toBe("＜作");
});

test("変換中に決めたあと、変換の終わりのイベントが来ても、文字は増えない", async () => {
	await render(<Harness />);
	await focusTextarea();
	startComposition();
	await userEvent.keyboard("＜作");
	await expect.poll(() => candidateButton().textContent).toBe("＜作り方＞");

	candidateButton().dispatchEvent(
		new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
	);
	getTextarea().dispatchEvent(
		new CompositionEvent("compositionend", { bubbles: true, data: "＜作" }),
	);

	await expect.poll(textareaValue).toBe("＜作り方＞\n");
});

test("変換中の Tab で、候補を決められる（IME の変換候補ではなく）", async () => {
	await render(<Harness />);
	await focusTextarea();
	startComposition();
	await userEvent.keyboard("＜作");
	await expect.poll(() => candidateButton().textContent).toBe("＜作り方＞");

	const tab = new KeyboardEvent("keydown", {
		key: "Process",
		code: "Tab",
		isComposing: true,
		bubbles: true,
		cancelable: true,
	});

	getTextarea().dispatchEvent(tab);

	// IME に Tab を渡さない。
	expect(tab.defaultPrevented).toBe(true);
	await expect.poll(textareaValue).toBe("＜作り方＞\n");
	await expect.poll(() => document.activeElement).toBe(getTextarea());
});

// Safari は、変換中の入力のイベントの時点で、変換中の文字の範囲全体を選択状態にする（先頭から末尾まで）。そのときも、範囲の末尾をカーソルとして、候補を出す。
test("変換中の文字が選択状態でも、候補を出す", async () => {
	await render(<Harness />);
	await focusTextarea();
	startComposition();

	const textarea = getTextarea();
	const setValue = Object.getOwnPropertyDescriptor(
		HTMLTextAreaElement.prototype,
		"value",
	)?.set;

	setValue?.call(textarea, "＜作");
	textarea.setSelectionRange(0, 2);
	textarea.dispatchEvent(new Event("input", { bubbles: true }));

	await expect.poll(() => candidateButton().textContent).toBe("＜作り方＞");
});

// Safari は、Tab を押すと、IME が先に変換（本文が「泊まった」のようになる）してから、キーのイベントが届く。変換する前に出ていた候補で、置き換える。
test("Safari の順番（変換のあとに Tab が届く）でも、候補を決められる", async () => {
	await render(<Harness compositionStrategy="replace-in-place" />);
	await focusTextarea();
	startComposition();
	await userEvent.keyboard("＜作");
	await expect.poll(() => candidateButton().textContent).toBe("＜作り方＞");

	const textarea = getTextarea();
	const setValue = Object.getOwnPropertyDescriptor(
		HTMLTextAreaElement.prototype,
		"value",
	)?.set;

	// IME が、変換中の文字を、別の文字（長さも違う）に変換した入力。
	setValue?.call(textarea, "＜作った");
	textarea.setSelectionRange(0, 4);
	textarea.dispatchEvent(new Event("input", { bubbles: true }));

	const tab = new KeyboardEvent("keydown", {
		key: "Process",
		code: "Tab",
		isComposing: true,
		bubbles: true,
		cancelable: true,
	});

	textarea.dispatchEvent(tab);

	expect(tab.defaultPrevented).toBe(true);
	await expect.poll(textareaValue).toBe("＜作り方＞\n");

	// 元に戻すと、IME が変換した文字ではなく、変換中の文字（打った文字）に戻り、もう1回で、打つ前に戻る。
	await userEvent.keyboard(undoKeys);

	expect(textareaValue()).toBe("＜作");

	await userEvent.keyboard(undoKeys);

	expect(textareaValue()).toBe("");
});

test("番号の直後の Backspace で、番号を一度に消せる。元に戻せる", async () => {
	await render(<Harness />);
	await focusTextarea();
	await userEvent.keyboard("1. 混ぜる{Enter}");

	expect(textareaValue()).toBe("1. 混ぜる\n2. ");

	await userEvent.keyboard("{Backspace}");

	expect(textareaValue()).toBe("1. 混ぜる\n");

	await userEvent.keyboard(undoKeys);

	expect(textareaValue()).toBe("1. 混ぜる\n2. ");
});

test("印の後ろに文字があるときも、印だけを消す。印の途中や文字の後ろは、ふつうの削除", async () => {
	await render(<Harness />);
	await focusTextarea();
	await userEvent.keyboard("1. 混ぜる");

	const textarea = getTextarea();

	textarea.setSelectionRange(3, 3);
	await userEvent.keyboard("{Backspace}");

	expect(textareaValue()).toBe("混ぜる");

	textarea.setSelectionRange(3, 3);
	await userEvent.keyboard("{Backspace}");

	// 文字の後ろは、1文字だけ消える。
	expect(textareaValue()).toBe("混ぜ");
});

// カーソルの行（画面上の上端と下端）。
function caretLine() {
	const textarea = getTextarea();
	const caret = measureTextareaCaret(textarea, textarea.selectionStart);
	const box = textarea.getBoundingClientRect();

	return {
		top: box.top + caret.top,
		bottom: box.top + caret.top + caret.height,
	};
}

function popupBox() {
	const list = document.querySelector('[aria-label="補完の候補"]');
	const popup = list?.parentElement;

	if (!popup) {
		throw new Error("補完の候補があるはず");
	}

	return popup.getBoundingClientRect();
}

test("候補は、カーソルの行の真下に出る（入力中の行には重ならない）", async () => {
	await render(<Harness completionLayout="caret" />);
	await focusTextarea();
	await userEvent.keyboard("\n\n\n＜作");
	await expect.poll(() => candidateButton().textContent).toBe("＜作り方＞");

	const line = caretLine();

	// 位置を測り終えて、見える状態になるのを待つ。
	await expect
		.poll(
			() =>
				getComputedStyle(candidateButton().closest("div") as Element)
					.visibility,
		)
		.toBe("visible");

	expect(popupBox().top).toBeGreaterThanOrEqual(line.bottom - 1);
	// 入力欄の下ではなく、カーソルの近く（入力欄の中）に出る。
	expect(popupBox().top).toBeLessThan(
		getTextarea().getBoundingClientRect().bottom,
	);
});

test("変換中は、IME の変換候補の窓と重ならないよう、カーソルの行の上に出る", async () => {
	await render(<Harness completionLayout="caret" />);
	await focusTextarea();
	await userEvent.keyboard("{Enter}".repeat(8));
	startComposition();
	await userEvent.keyboard("＜作");
	await expect.poll(() => candidateButton().textContent).toBe("＜作り方＞");
	await expect
		.poll(
			() =>
				getComputedStyle(candidateButton().closest("div") as Element)
					.visibility,
		)
		.toBe("visible");

	expect(popupBox().bottom).toBeLessThanOrEqual(caretLine().top + 1);
});

test("スマホでは、キーボードのすぐ上に固定した、横にスクロールできる帯で出る", async () => {
	await render(<Harness completionLayout="keyboard-bar" />);
	await focusTextarea();
	await userEvent.keyboard("＜作");
	await expect.poll(() => candidateButton().textContent).toBe("＜作り方＞");

	const list = document.querySelector('[aria-label="補完の候補"]');
	const bar = list?.parentElement;

	if (!list || !bar) {
		throw new Error("補完の候補があるはず");
	}

	expect(getComputedStyle(bar).position).toBe("fixed");
	expect(getComputedStyle(list).overflowX).toBe("auto");
});

// 変換中は、素の矢印と Shift+矢印を IME に任せ、Alt（Option）+↑↓ で、こちらの候補を選ぶ。
function compositionKey(init: KeyboardEventInit) {
	const event = new KeyboardEvent("keydown", {
		isComposing: true,
		bubbles: true,
		cancelable: true,
		...init,
	});

	getTextarea().dispatchEvent(event);

	return event;
}

function selectedCandidate() {
	return document.querySelector(
		'[aria-label="補完の候補"] button[aria-current="true"]',
	)?.textContent;
}

test("変換中は、Alt+↑↓ で候補を選び、Tab で決められる（素の矢印は IME に任せる）", async () => {
	await render(<Harness completionLayout="caret" />);
	await focusTextarea();
	startComposition();
	await userEvent.keyboard("＜");
	await expect.poll(() => candidateButton().textContent).toBe("＜材料＞");

	// 素の矢印と Shift+矢印は、IME に任せる。
	expect(
		compositionKey({ key: "ArrowDown", code: "ArrowDown" }).defaultPrevented,
	).toBe(false);
	expect(
		compositionKey({ key: "ArrowDown", code: "ArrowDown", shiftKey: true })
			.defaultPrevented,
	).toBe(false);
	expect(selectedCandidate()).toBeUndefined();

	// Windows は、1回目の keydown（key が Process）は、数えない。
	expect(
		compositionKey({ key: "Process", code: "ArrowDown", altKey: true })
			.defaultPrevented,
	).toBe(false);
	expect(selectedCandidate()).toBeUndefined();

	// Alt+↓ を2回で、2つ目（＜下準備＞）。
	expect(
		compositionKey({ key: "ArrowDown", code: "ArrowDown", altKey: true })
			.defaultPrevented,
	).toBe(true);
	compositionKey({ key: "ArrowDown", code: "ArrowDown", altKey: true });
	await expect.poll(selectedCandidate).toBe("＜下準備＞");

	// Alt+↑ で戻る。
	compositionKey({ key: "ArrowUp", code: "ArrowUp", altKey: true });
	await expect.poll(selectedCandidate).toBe("＜材料＞");

	// 選んだあとの Tab で、選んだ候補に決まる。
	compositionKey({ key: "ArrowDown", code: "ArrowDown", altKey: true });
	await expect.poll(selectedCandidate).toBe("＜下準備＞");

	const tab = compositionKey({ key: "Process", code: "Tab" });

	expect(tab.defaultPrevented).toBe(true);
	await expect.poll(textareaValue).toBe("＜下準備＞\n");
});

// Enter は、IME が変換中の文字を確定する操作。Mac の IME は、止めても、確定の入力をあとから送ってきて、置き換えた本文の先頭に入ってしまう。補完には使わない。
test("変換中の Enter は、候補を選んでいても、IME に任せる", async () => {
	await render(<Harness completionLayout="caret" />);
	await focusTextarea();
	startComposition();
	await userEvent.keyboard("＜");
	await expect.poll(() => candidateButton().textContent).toBe("＜材料＞");
	// 入力のあとの、カーソルの位置の通知（選択をリセットする）が、落ち着くのを待つ。
	await new Promise((resolve) => setTimeout(resolve, 100));
	compositionKey({ key: "ArrowDown", code: "ArrowDown", altKey: true });
	await expect.poll(selectedCandidate).toBe("＜材料＞");

	expect(
		compositionKey({ key: "Process", code: "Enter" }).defaultPrevented,
	).toBe(false);
	expect(textareaValue()).toBe("＜");
});
