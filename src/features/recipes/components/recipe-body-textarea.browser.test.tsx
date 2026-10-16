import { useState } from "react";
import { expect, test } from "vitest";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { measureTextareaCaret } from "#/components/completion-menu/measure-textarea-caret";
import type { CompositionStrategy } from "#/ime/choose-composition-strategy";
import type {
	LinkableUser,
	OtherRecipeTarget,
} from "../domain/other-recipe-links";
import type {
	RecipeLinkReference,
	RecipeLinkTarget,
} from "../domain/recipe-links";
import { RecipeBodyTextarea } from "./recipe-body-textarea";

// 変換中の補完の方式は、実行する環境（OS・ブラウザ）で変わるので、テストでは、既定で明示する。
function Harness({
	compositionStrategy = "end-then-replace",
	completionLayout,
	linkTargets,
	onLinkSelected,
	searchLinkableUsers,
	loadUserRecipes,
	initialValue = "",
}: {
	initialValue?: string;
	compositionStrategy?: CompositionStrategy;
	completionLayout?: "caret" | "keyboard-bar";
	linkTargets?: RecipeLinkTarget[];
	onLinkSelected?: (link: RecipeLinkReference) => void;
	searchLinkableUsers?: (query: string) => Promise<LinkableUser[]>;
	loadUserRecipes?: (handle: string) => Promise<OtherRecipeTarget[]>;
}) {
	const [value, setValue] = useState(initialValue);

	return (
		<RecipeBodyTextarea
			value={value}
			onChange={setValue}
			recipeNames={["玉ねぎ"]}
			compositionStrategy={compositionStrategy}
			completionLayout={completionLayout}
			linkTargets={linkTargets}
			onLinkSelected={onLinkSelected}
			searchLinkableUsers={searchLinkableUsers}
			loadUserRecipes={loadUserRecipes}
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
	await expect.poll(() => candidateButton().textContent).toBe("＜下準備＞");

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

	// Alt+↓ を2回で、2つ目（＜材料＞）。
	expect(
		compositionKey({ key: "ArrowDown", code: "ArrowDown", altKey: true })
			.defaultPrevented,
	).toBe(true);
	compositionKey({ key: "ArrowDown", code: "ArrowDown", altKey: true });
	await expect.poll(selectedCandidate).toBe("＜材料＞");

	// Alt+↑ で戻る。
	compositionKey({ key: "ArrowUp", code: "ArrowUp", altKey: true });
	await expect.poll(selectedCandidate).toBe("＜下準備＞");

	// 選んだあとの Tab で、選んだ候補に決まる。
	compositionKey({ key: "ArrowDown", code: "ArrowDown", altKey: true });
	await expect.poll(selectedCandidate).toBe("＜材料＞");

	const tab = compositionKey({ key: "Process", code: "Tab" });

	expect(tab.defaultPrevented).toBe(true);
	await expect.poll(textareaValue).toBe("＜材料＞\n");
});

// Enter は、IME が変換中の文字を確定する操作。Mac の IME は、止めても、確定の入力をあとから送ってきて、置き換えた本文の先頭に入ってしまう。補完には使わない。
test("変換中の Enter は、候補を選んでいても、IME に任せる", async () => {
	await render(<Harness completionLayout="caret" />);
	await focusTextarea();
	startComposition();
	await userEvent.keyboard("＜");
	await expect.poll(() => candidateButton().textContent).toBe("＜下準備＞");
	// 入力のあとの、カーソルの位置の通知（選択をリセットする）が、落ち着くのを待つ。
	await new Promise((resolve) => setTimeout(resolve, 100));
	compositionKey({ key: "ArrowDown", code: "ArrowDown", altKey: true });
	await expect.poll(selectedCandidate).toBe("＜下準備＞");

	expect(
		compositionKey({ key: "Process", code: "Enter" }).defaultPrevented,
	).toBe(false);
	expect(textareaValue()).toBe("＜");
});

function hintKeys() {
	return [
		...document.querySelectorAll('[aria-label="補完の候補"] + p kbd'),
	].map((kbd) => kbd.textContent);
}

test("候補の下のヒントは、ショートカットを、キーごとに表示する", async () => {
	await render(<Harness completionLayout="caret" />);
	await focusTextarea();
	await userEvent.keyboard("＜");
	await expect.poll(() => candidateButton().textContent).toBe("＜下準備＞");

	expect(hintKeys()).toEqual(["↑↓", "Tab", "Esc"]);
});

test("変換中のヒントは、Alt（Apple 系は Option）+↑↓ を示す", async () => {
	await render(<Harness completionLayout="caret" />);
	await focusTextarea();
	startComposition();
	await userEvent.keyboard("＜");
	await expect.poll(() => candidateButton().textContent).toBe("＜下準備＞");
	await expect.poll(() => hintKeys().slice(1)).toEqual(["↑↓", "Tab"]);
	// 先頭は、OS によって、Alt（Windows・Linux）か Option（Apple 系）。
	expect(["Alt", "Option"]).toContain(hintKeys()[0]);
});

const linkTargets = [
	{
		publicId: "a",
		name: "トマトカレー",
		createdAt: "2026-10-01T00:00:00+09:00",
	},
	{
		publicId: "b",
		name: "カレーうどん",
		createdAt: "2026-10-01T00:00:00+09:00",
	},
];

test("[[ のあとの文字で、レシピの候補が出て、選ぶと [[名前]] が入り、リンクが記録される", async () => {
	const linked: RecipeLinkReference[] = [];

	await render(
		<Harness
			completionLayout="caret"
			linkTargets={linkTargets}
			onLinkSelected={(link) => linked.push(link)}
		/>,
	);
	await focusTextarea();
	// userEvent.keyboard では、[[ が、[ 1文字を表す（[ のキー指定の書き方）ので、[[[[ と書く。
	await userEvent.keyboard("1. [[[[かれ");
	await expect.poll(() => candidateButton().textContent).toBe("カレーうどん");

	candidateButton().dispatchEvent(
		new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
	);

	await expect.poll(textareaValue).toBe("1. [[カレーうどん]]");
	expect(linked).toEqual([{ label: "カレーうどん", targetPublicId: "b" }]);
});

test("変換中でも、[[ の候補を、Tab で決められ、リンクが記録される", async () => {
	const linked: RecipeLinkReference[] = [];

	await render(
		<Harness
			completionLayout="caret"
			linkTargets={linkTargets}
			onLinkSelected={(link) => linked.push(link)}
		/>,
	);
	await focusTextarea();
	startComposition();
	await userEvent.keyboard("[[[[かれ");
	await expect.poll(() => candidateButton().textContent).toBe("カレーうどん");

	compositionKey({ key: "Process", code: "Tab" });

	await expect.poll(textareaValue).toBe("[[カレーうどん]]");
	expect(linked).toEqual([{ label: "カレーうどん", targetPublicId: "b" }]);
});

test("linkTargets がなければ、「現在の位置にレシピをリンク」のボタンも、[[ の候補も出ない", async () => {
	await render(<Harness completionLayout="caret" />);
	await focusTextarea();
	await userEvent.keyboard("[[[[かれ");

	expect(document.querySelector('[aria-label="補完の候補"]')).toBeNull();
	expect(
		[...document.querySelectorAll("button")].some(
			(button) => button.textContent === "現在の位置にレシピをリンク",
		),
	).toBe(false);
});

test("[[@ でユーザーを探し、選ぶと、そのユーザーのレシピの候補が出て、選ぶと「表示名の料理名」のリンクが入る", async () => {
	const linked: RecipeLinkReference[] = [];

	await render(
		<Harness
			completionLayout="caret"
			linkTargets={linkTargets}
			onLinkSelected={(link) => linked.push(link)}
			searchLinkableUsers={async () => [{ handle: "taro", name: "たろう" }]}
			loadUserRecipes={async () => [
				{
					publicId: "r1",
					name: "カレー",
					createdAt: "2026-10-01T00:00:00+09:00",
					authorName: "たろう",
					authorHandle: "taro",
				},
			]}
		/>,
	);
	await focusTextarea();
	await userEvent.keyboard("[[[[@t");
	await expect
		.poll(() => candidateButton().textContent)
		.toBe("たろう（@taro）");

	candidateButton().dispatchEvent(
		new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
	);

	await expect.poll(textareaValue).toBe("[[@taro/");
	await expect.poll(() => candidateButton().textContent).toBe("カレー");

	candidateButton().dispatchEvent(
		new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
	);

	await expect.poll(textareaValue).toBe("[[たろうのカレー]]");
	expect(linked).toEqual([{ label: "たろうのカレー", targetPublicId: "r1" }]);
});

test("[[@ で候補がないとき、理由を、補完のメニューの中に出す（探している最中・見つからない・失敗）", async () => {
	let finish: (users: LinkableUser[]) => void = () => {};
	let isSearchCalled = false;

	await render(
		<Harness
			completionLayout="caret"
			linkTargets={linkTargets}
			searchLinkableUsers={() =>
				new Promise<LinkableUser[]>((resolve) => {
					isSearchCalled = true;
					finish = resolve;
				})
			}
			loadUserRecipes={async () => []}
		/>,
	);
	await focusTextarea();
	await userEvent.keyboard("[[[[@");
	await expect
		.poll(() => document.querySelector("output")?.textContent)
		.toContain("ユーザーを探しています");
	// 理由は、補完のメニュー（候補の枠）の中にある。
	expect(
		document
			.querySelector("output")
			?.parentElement?.className.includes("completion-menu_popup"),
	).toBe(true);
	// 少し待ってから、検索が呼ばれる（打ち終わるのを待つため）。
	await expect.poll(() => isSearchCalled).toBe(true);

	finish([]);

	await expect
		.poll(() => document.querySelector("output")?.textContent)
		.toContain("自分のレシピは、@ を付けずに [[ だけで選べます");
});

test("日本語入力のまま打った全角の ＠ でも、ユーザーの候補が出る", async () => {
	await render(
		<Harness
			completionLayout="caret"
			linkTargets={linkTargets}
			searchLinkableUsers={async () => [{ handle: "taro", name: "たろう" }]}
			loadUserRecipes={async () => []}
		/>,
	);
	await focusTextarea();
	await userEvent.keyboard("[[[[＠");
	await expect
		.poll(() => candidateButton().textContent)
		.toBe("たろう（@taro）");
});

test("Mac の Chrome：変換中に候補をクリックすると、IME が先に確定し（compositionend）、そのあとに押下が届く。それでも、候補が決まる", async () => {
	const linked: RecipeLinkReference[] = [];

	await render(
		<Harness
			completionLayout="caret"
			linkTargets={linkTargets}
			onLinkSelected={(link) => linked.push(link)}
		/>,
	);
	await focusTextarea();
	startComposition();
	await userEvent.keyboard("[[[[かれ");
	await expect.poll(() => candidateButton().textContent).toBe("カレーうどん");

	// 実機のログ（Mac の Chrome）：クリックで、IME が、先に確定する。そのあと、約10ms で、pointerdown・mousedown が届く。
	getTextarea().dispatchEvent(
		new CompositionEvent("compositionend", { bubbles: true, data: "かれ" }),
	);
	await new Promise((resolve) => setTimeout(resolve, 10));

	candidateButton().dispatchEvent(
		new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
	);
	candidateButton().dispatchEvent(
		new MouseEvent("mousedown", { bubbles: true, cancelable: true }),
	);

	await expect.poll(textareaValue).toBe("[[カレーうどん]]");
	expect(linked).toEqual([{ label: "カレーうどん", targetPublicId: "b" }]);
});

test("変換が確定しても、本文とカーソルが動くまで、メニューは、位置を動かさない（確定の直後のクリックが、外れないように）", async () => {
	// メニューを、カーソルの上に置けるよう、入力欄の上に余白を取る。
	await render(
		<>
			<div style={{ height: 300 }} />
			<Harness completionLayout="caret" linkTargets={linkTargets} />
		</>,
	);
	await focusTextarea();
	startComposition();
	await userEvent.keyboard("[[[[かれ");
	await expect.poll(() => candidateButton().textContent).toBe("カレーうどん");

	const popup = () => {
		const element = document.querySelector(
			'[aria-label="補完の候補"]',
		)?.parentElement;

		if (!element) throw new Error("メニューがあるはず");

		return element.getBoundingClientRect();
	};
	const before = popup().top;

	getTextarea().dispatchEvent(
		new CompositionEvent("compositionend", { bubbles: true, data: "かれ" }),
	);
	await new Promise((resolve) => setTimeout(resolve, 100));

	expect(popup().top).toBe(before);

	// 続けて打てば、通常の位置（カーソルの下）に戻る。
	await userEvent.keyboard("ー");
	await expect.poll(() => popup().top).not.toBe(before);
});

// 案内（Tips）：空のときは placeholder の下に、見出しだけの雛形のあいだは、フォーカスする前だけ、入力欄の下に重ねて出す。
function findTips(): HTMLElement | undefined {
	return [
		...document.querySelectorAll<HTMLElement>('[aria-hidden="true"]'),
	].find((element) => element.textContent?.startsWith("Tips"));
}

test("空のときは、placeholder の下に、案内をまとめて書く", async () => {
	await render(
		<Harness
			linkTargets={[]}
			searchLinkableUsers={async () => []}
			loadUserRecipes={async () => []}
		/>,
	);

	const placeholder = getTextarea().placeholder;

	expect(placeholder).toContain("Tips");
	expect(placeholder).toContain("材料名・食材名は、入力すると補完が出ます");
	expect(placeholder).toContain("[[@ で他の人のレシピ");
});

test("見出しだけの雛形のあいだ、フォーカスする前だけ、案内を重ねて出す（折り返して、はみ出さない）", async () => {
	await render(
		<Harness
			initialValue={"＜材料＞\n\n＜作り方＞\n"}
			linkTargets={[]}
			searchLinkableUsers={async () => []}
			loadUserRecipes={async () => []}
		/>,
	);

	const textarea = getTextarea();

	await expect.poll(findTips).toBeDefined();

	const tips = findTips() as HTMLElement;

	expect(tips.getBoundingClientRect().right).toBeLessThanOrEqual(
		textarea.getBoundingClientRect().right,
	);
	expect(tips.getBoundingClientRect().bottom).toBeLessThanOrEqual(
		textarea.getBoundingClientRect().bottom,
	);

	// フォーカスすると、消える。
	await focusTextarea();
	await expect.poll(findTips).toBeUndefined();
});

test("中身が書かれたら、案内は出さない", async () => {
	await render(<Harness initialValue={"＜材料＞\n卵 1個\n"} />);

	expect(findTips()).toBeUndefined();
});
