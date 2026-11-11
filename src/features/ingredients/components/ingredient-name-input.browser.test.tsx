import { useState } from "react";
import { expect, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { CompositionStrategy } from "#/ime/choose-composition-strategy";
import { IngredientNameInput } from "./ingredient-name-input";

function Harness() {
	const [value, setValue] = useState("");

	return (
		// 候補が上に出ても、画面からはみ出さない余白。
		<div style={{ paddingTop: 320 }}>
			<IngredientNameInput
				id="name"
				value={value}
				onChange={setValue}
				compositionStrategy="end-then-replace"
			/>
		</div>
	);
}

// 実際のブラウザの変換（IME）のイベントで確かめる。
it("変換中は、カタログの名前と完全に一致しても、候補が出たままになる", async () => {
	await render(<Harness />);

	const input = document.querySelector("input") as HTMLInputElement;

	input.focus();

	for (const text of ["に", "にん", "にんに", "にんにく"]) {
		await cdp().send("Input.imeSetComposition", {
			text,
			selectionStart: text.length,
			selectionEnd: text.length,
		});

		await expect
			.poll(() => document.querySelector('[role="listbox"]'), {
				message: `「${text}」で候補が出る`,
			})
			.not.toBeNull();
	}
});

it("PC の変換中は、変換候補と重ならないよう、候補を入力欄の上に出す。確定の直後は上のまま（クリックが外れない）、続けて打つと下に戻す", async () => {
	// PC の幅（768px 以上）で確かめる。
	await page.viewport(1024, 768);
	await render(<Harness />);

	const input = document.querySelector("input") as HTMLInputElement;
	const listTop = () =>
		document.querySelector('[role="listbox"]')?.getBoundingClientRect().top;

	input.focus();

	await cdp().send("Input.imeSetComposition", {
		text: "にん",
		selectionStart: 2,
		selectionEnd: 2,
	});

	await expect
		.poll(() => document.querySelector('[role="listbox"]'))
		.not.toBeNull();

	const list = document.querySelector('[role="listbox"]') as HTMLElement;

	expect(list.getBoundingClientRect().bottom).toBeLessThanOrEqual(
		input.getBoundingClientRect().top,
	);

	await cdp().send("Input.insertText", { text: "にん" });

	// 確定で一覧が動くと、その直後のクリックが、動いた先に当たる。
	expect(list.getBoundingClientRect().bottom).toBeLessThanOrEqual(
		input.getBoundingClientRect().top,
	);

	await cdp().send("Input.insertText", { text: "じ" });

	await expect.poll(() => input.value).toBe("にんじ");
	await expect
		.poll(() => (listTop() ?? 0) >= input.getBoundingClientRect().bottom)
		.toBe(true);
});

// シートのような、はみ出しを切る枠の中に置く。
function ClippedHarness({ paddingTop }: { paddingTop: number }) {
	const [value, setValue] = useState("");

	return (
		<div style={{ paddingTop }}>
			<div style={{ height: 80, overflow: "hidden" }}>
				<IngredientNameInput
					id="name"
					value={value}
					onChange={setValue}
					compositionStrategy="end-then-replace"
				/>
			</div>
		</div>
	);
}

function getVisibleList() {
	const list = document.querySelector<HTMLElement>('[role="listbox"]');

	return list && getComputedStyle(list).visibility === "visible" ? list : null;
}

it("はみ出しを切る枠の中でも、一覧は切れずに、画面の内に出る", async () => {
	await page.viewport(1024, 768);
	await render(<ClippedHarness paddingTop={0} />);

	const input = document.querySelector("input") as HTMLInputElement;

	input.focus();
	await cdp().send("Input.insertText", { text: "に" });

	await expect.poll(getVisibleList).not.toBeNull();

	const list = getVisibleList() as HTMLElement;
	const rect = list.getBoundingClientRect();

	expect(rect.top).toBeGreaterThanOrEqual(input.getBoundingClientRect().bottom);
	// 枠（高さ 80px）より下の部分も、切られずに見えている（その位置で、いちばん上にあるのが一覧）。
	expect(rect.bottom - 10).toBeGreaterThan(80);
	expect(
		list.contains(document.elementFromPoint(rect.left + 20, rect.bottom - 10)),
	).toBe(true);
	expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
	// 一覧のカード（案内を含む）の幅は、入力欄に合わせる。
	expect(list.parentElement?.getBoundingClientRect().width).toBe(
		input.getBoundingClientRect().width,
	);
});

it("変換中に、上の余白が少ないときは、一覧を縮めて上に出す", async () => {
	await page.viewport(1024, 768);
	await render(<ClippedHarness paddingTop={120} />);

	const input = document.querySelector("input") as HTMLInputElement;

	input.focus();
	await cdp().send("Input.imeSetComposition", {
		text: "に",
		selectionStart: 1,
		selectionEnd: 1,
	});

	await expect.poll(getVisibleList).not.toBeNull();

	const rect = (getVisibleList() as HTMLElement).getBoundingClientRect();

	expect(rect.top).toBeGreaterThanOrEqual(8);
	expect(rect.bottom).toBeLessThanOrEqual(input.getBoundingClientRect().top);
});

it("変換中に、上に余白がないときは、IME の窓に隠れないよう、一覧を出さず、確定したら下に出す", async () => {
	await page.viewport(1024, 768);
	await render(<ClippedHarness paddingTop={0} />);

	const input = document.querySelector("input") as HTMLInputElement;

	input.focus();
	await cdp().send("Input.imeSetComposition", {
		text: "にん",
		selectionStart: 2,
		selectionEnd: 2,
	});

	await expect
		.poll(() => document.querySelector('[role="listbox"]'))
		.not.toBeNull();
	expect(getVisibleList()).toBeNull();
	expect(input).toHaveAttribute("aria-expanded", "false");

	await cdp().send("Input.insertText", { text: "にん" });

	await expect.poll(getVisibleList).not.toBeNull();
	expect(
		(getVisibleList() as HTMLElement).getBoundingClientRect().top,
	).toBeGreaterThanOrEqual(input.getBoundingClientRect().bottom);
});

// キー操作は、レシピの本文の補完とそろえる。次の欄（Tab の行き先）を置く。
function KeyHarness({
	compositionStrategy,
}: {
	compositionStrategy?: CompositionStrategy;
}) {
	const [value, setValue] = useState("");

	return (
		<div style={{ paddingTop: 320 }}>
			<IngredientNameInput
				id="name"
				value={value}
				onChange={setValue}
				compositionStrategy={compositionStrategy}
			/>
			<input aria-label="次の欄" />
		</div>
	);
}

function nameInput() {
	return document.querySelector("#name") as HTMLInputElement;
}

function optionTexts() {
	return [
		...document.querySelectorAll<HTMLElement>(
			'[role="listbox"] [role="option"]',
		),
	].map((option) => option.textContent ?? "");
}

function selectedOptionText() {
	return document.querySelector<HTMLElement>(
		'[role="listbox"] [aria-selected="true"]',
	)?.textContent;
}

function composingKey(init: KeyboardEventInit) {
	const event = new KeyboardEvent("keydown", {
		isComposing: true,
		bubbles: true,
		cancelable: true,
		...init,
	});

	nameInput().dispatchEvent(event);

	return event;
}

async function composeText(text: string) {
	await cdp().send("Input.imeSetComposition", {
		text,
		selectionStart: text.length,
		selectionEnd: text.length,
	});
	await expect.poll(getVisibleList).not.toBeNull();
}

it("候補が出ているときの Tab で先頭の候補に決まり、次の Tab で次の欄へ移る", async () => {
	await page.viewport(1024, 768);
	await render(<KeyHarness />);
	nameInput().focus();
	await userEvent.keyboard("にんじ");
	await expect.poll(getVisibleList).not.toBeNull();

	const [first] = optionTexts();

	await userEvent.keyboard("{Tab}");

	await expect.poll(() => nameInput().value).toBe(first);
	expect(document.activeElement).toBe(nameInput());
	await expect.poll(getVisibleList).toBeNull();

	await userEvent.keyboard("{Tab}");

	expect(document.activeElement).toBe(
		document.querySelector('[aria-label="次の欄"]'),
	);
});

it("↓で選んだ候補に、Tab で決まる", async () => {
	await page.viewport(1024, 768);
	await render(<KeyHarness />);
	nameInput().focus();
	await userEvent.keyboard("にん");
	await expect.poll(() => optionTexts().length).toBeGreaterThan(1);

	const [, second] = optionTexts();

	await userEvent.keyboard("{ArrowDown}{ArrowDown}");
	await expect.poll(selectedOptionText).toBe(second);
	await userEvent.keyboard("{Tab}");

	await expect.poll(() => nameInput().value).toBe(second);
});

it("変換中は、Alt+↑↓ で候補を選び、Tab で決める（素の矢印と Enter は IME に任せる）", async () => {
	await page.viewport(1024, 768);
	await render(<KeyHarness compositionStrategy="end-then-replace" />);
	nameInput().focus();
	await composeText("にん");
	await expect.poll(() => optionTexts().length).toBeGreaterThan(1);

	const [, second] = optionTexts();

	// 素の矢印・Shift+矢印・Enter は、IME に任せる。
	expect(
		composingKey({ key: "ArrowDown", code: "ArrowDown" }).defaultPrevented,
	).toBe(false);
	expect(
		composingKey({ key: "ArrowDown", code: "ArrowDown", shiftKey: true })
			.defaultPrevented,
	).toBe(false);
	expect(composingKey({ key: "Process", code: "Enter" }).defaultPrevented).toBe(
		false,
	);
	expect(selectedOptionText()).toBeUndefined();

	// Windows の1回目の keydown（key が Process）は、数えない。
	expect(
		composingKey({ key: "Process", code: "ArrowDown", altKey: true })
			.defaultPrevented,
	).toBe(false);
	expect(selectedOptionText()).toBeUndefined();

	// Alt+↓ を2回で、2つ目。
	expect(
		composingKey({ key: "ArrowDown", code: "ArrowDown", altKey: true })
			.defaultPrevented,
	).toBe(true);
	composingKey({ key: "ArrowDown", code: "ArrowDown", altKey: true });
	await expect.poll(selectedOptionText).toBe(second);

	const tab = composingKey({ key: "Process", code: "Tab" });

	// IME に Tab を渡さない。変換を確定させてから置き換え、フォーカスを戻す。
	expect(tab.defaultPrevented).toBe(true);
	await expect.poll(() => nameInput().value).toBe(second);
	await expect.poll(() => document.activeElement).toBe(nameInput());
});

// Safari は、Tab を押すと、IME が先に変換してから、キーのイベントが届く。変換する前に出ていた候補で決める。
it("Safari の順番（変換のあとに Tab が届く）でも、変換する前に出ていた候補に決まる", async () => {
	await page.viewport(1024, 768);
	await render(<KeyHarness compositionStrategy="replace-in-place" />);

	const input = nameInput();

	input.focus();
	input.dispatchEvent(
		new CompositionEvent("compositionstart", { bubbles: true }),
	);

	const setValue = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value",
	)?.set;

	setValue?.call(input, "にんじ");
	input.dispatchEvent(new Event("input", { bubbles: true }));
	await expect.poll(getVisibleList).not.toBeNull();

	const [first] = optionTexts();

	// IME が、変換中の文字を、候補に出ない文字に変換した入力。
	setValue?.call(input, "人事");
	input.dispatchEvent(new Event("input", { bubbles: true }));

	const tab = composingKey({ key: "Process", code: "Tab" });

	expect(tab.defaultPrevented).toBe(true);
	await expect.poll(() => nameInput().value).toBe(first);
});

// 変換中に、候補をマウスで押す（入力欄からフォーカスを外さない）。変換を確定させてから置き換え、確定した文字を重ねない。
it("変換中に候補をクリックしても、変換中の文字が重ならず、候補の名前だけになる", async () => {
	await page.viewport(1024, 768);
	await render(<KeyHarness compositionStrategy="end-then-replace" />);
	nameInput().focus();
	await composeText("にん");

	const [, second] = optionTexts();
	const option = [
		...document.querySelectorAll<HTMLElement>(
			'[role="listbox"] [role="option"]',
		),
	][1];

	await userEvent.click(option as HTMLElement);

	await expect.poll(() => nameInput().value).toBe(second);
	await expect.poll(() => document.activeElement).toBe(nameInput());

	// 変換が残っていれば、ここで確定した文字が足される。
	nameInput().blur();
	nameInput().focus();

	expect(nameInput().value).toBe(second);
});

// Mac の Chrome：文節を選んだまま（「に」を選び「ん」が残る）クリックすると、IME が先に確定させ、数十ミリ秒あとにクリックが届く。
// 確定の直後に一覧が動くと、クリックが外れる（実機の記録）。確定の直後は動かさない。
it("文節を選んだままの変換が確定した直後は、一覧を動かさず、そこをクリックすると候補に決まる", async () => {
	await page.viewport(1024, 768);
	await render(<KeyHarness compositionStrategy="end-then-replace" />);
	nameInput().focus();
	await composeText("にん");
	await cdp().send("Input.imeSetComposition", {
		text: "にん",
		selectionStart: 0,
		selectionEnd: 1,
	});

	const list = () =>
		document.querySelector('[role="listbox"]')?.getBoundingClientRect();
	const before = list()?.top;
	const [first] = optionTexts();

	// IME が、クリックで確定させる。
	await cdp().send("Input.insertText", { text: "にん" });

	expect(list()?.top).toBe(before);

	await userEvent.click(
		document.querySelector('[role="listbox"] [role="option"]') as HTMLElement,
	);

	await expect.poll(() => nameInput().value).toBe(first);
});

it("キー（Enter）で変換を確定したときは、すぐ、一覧を通常の位置（入力欄の下）に戻す", async () => {
	await page.viewport(1024, 768);
	await render(<KeyHarness compositionStrategy="end-then-replace" />);
	nameInput().focus();
	await composeText("にん");

	// 変換中の Enter（IME が受けて、確定させる）。
	composingKey({ key: "Enter", code: "Enter" });
	await cdp().send("Input.insertText", { text: "にん" });

	await expect
		.poll(
			() =>
				(document.querySelector('[role="listbox"]')?.getBoundingClientRect()
					.top ?? 0) >= nameInput().getBoundingClientRect().bottom,
			{ timeout: 200 },
		)
		.toBe(true);
});

// Mac の Chrome：文節に区切って変換している途中（「冷凍」を選んだまま「う」が残る）に Tab で決めると、
// フォーカスを戻したときに、IME が、確定した文字を insertText でもう一度入れる（実機の記録）。その入力を取り除く。
it("変換中に Tab で決めたあと、IME が確定した文字をもう一度入れても、重ならない", async () => {
	await page.viewport(1024, 768);
	await render(<KeyHarness compositionStrategy="end-then-replace" />);
	nameInput().focus();
	await composeText("にん");

	const [first] = optionTexts();

	composingKey({ key: "Tab", code: "Tab" });

	await expect.poll(() => nameInput().value).toBe(first);
	await expect.poll(() => document.activeElement).toBe(nameInput());

	// フォーカスを戻した直後に、IME が入れ直す文字。
	await cdp().send("Input.insertText", { text: "にん" });

	expect(nameInput().value).toBe(first);
});

it("候補は、8件で切らずに、近い順にすべて出す", async () => {
	await page.viewport(1024, 768);
	await render(<KeyHarness />);
	nameInput().focus();
	await userEvent.keyboard("に");

	await expect.poll(() => optionTexts().length).toBeGreaterThan(8);
});

it("矢印で選んだ候補が、一覧の見える範囲の外にあれば、見える位置までスクロールする", async () => {
	await page.viewport(1024, 768);
	await render(<KeyHarness />);
	nameInput().focus();
	await userEvent.keyboard("に");
	await expect.poll(() => optionTexts().length).toBeGreaterThan(8);

	const count = optionTexts().length;

	// いちばん下の候補まで動かす。
	await userEvent.keyboard("{ArrowDown}".repeat(count));
	await expect.poll(selectedOptionText).toBe(optionTexts()[count - 1]);

	const list = document.querySelector('[role="listbox"]') as HTMLElement;
	const selected = document.querySelector(
		'[role="listbox"] [aria-selected="true"]',
	) as HTMLElement;

	await expect
		.poll(
			() =>
				selected.getBoundingClientRect().bottom <=
					list.getBoundingClientRect().bottom + 1 &&
				selected.getBoundingClientRect().top >=
					list.getBoundingClientRect().top - 1,
		)
		.toBe(true);
});

function hintText() {
	return document.querySelector('[role="listbox"] + p')?.textContent;
}

it("一覧の下に、キー操作の案内を出す（変換中は Alt+↑↓）", async () => {
	await page.viewport(1024, 768);
	await render(<KeyHarness compositionStrategy="end-then-replace" />);
	nameInput().focus();
	await composeText("にん");

	await expect.poll(hintText).toContain("で選び、");
	expect(
		[...document.querySelectorAll('[role="listbox"] + p kbd')].map(
			(kbd) => kbd.textContent,
		),
	).toContain("Tab");
	const composingHint = hintText();

	await cdp().send("Input.insertText", { text: "にん" });

	await expect.poll(hintText).not.toBe(composingHint);
	expect(hintText()).toContain("で閉じる");
});

it("候補が出ているときの Esc は、候補だけを閉じ、外側（シート）には伝えない", async () => {
	await page.viewport(1024, 768);

	// シートは、外側（document）で Esc を受けて閉じる。
	let outerEscapes = 0;
	const countEscape = (event: KeyboardEvent) => {
		if (event.key === "Escape") {
			outerEscapes += 1;
		}
	};

	document.addEventListener("keydown", countEscape);
	await render(<KeyHarness />);
	nameInput().focus();
	await userEvent.keyboard("にん");
	await expect.poll(getVisibleList).not.toBeNull();

	await userEvent.keyboard("{Escape}");

	await expect.poll(getVisibleList).toBeNull();
	expect(outerEscapes).toBe(0);

	// 候補が出ていなければ、外側に伝える（シートを閉じられる）。
	await userEvent.keyboard("{Escape}");

	expect(outerEscapes).toBe(1);
	document.removeEventListener("keydown", countEscape);
});
