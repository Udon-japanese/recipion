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
			<IngredientNameInput id="name" value={value} onChange={setValue} />
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

it("PC の変換中は、変換候補と重ならないよう、候補を入力欄の上に出し、確定したら下に戻す", async () => {
	// PC の幅（768px 以上）で確かめる。
	await page.viewport(1024, 768);
	await render(<Harness />);

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

	const list = document.querySelector('[role="listbox"]') as HTMLElement;

	expect(list.getBoundingClientRect().bottom).toBeLessThanOrEqual(
		input.getBoundingClientRect().top,
	);

	await cdp().send("Input.insertText", { text: "にん" });

	await expect
		.poll(() => {
			const current = document.querySelector('[role="listbox"]');

			return current
				? current.getBoundingClientRect().top >=
						input.getBoundingClientRect().bottom
				: true;
		})
		.toBe(true);
});

// シートのような、はみ出しを切る枠の中に置く。
function ClippedHarness({ paddingTop }: { paddingTop: number }) {
	const [value, setValue] = useState("");

	return (
		<div style={{ paddingTop }}>
			<div style={{ height: 80, overflow: "hidden" }}>
				<IngredientNameInput id="name" value={value} onChange={setValue} />
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
	expect(rect.width).toBe(input.getBoundingClientRect().width);
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
