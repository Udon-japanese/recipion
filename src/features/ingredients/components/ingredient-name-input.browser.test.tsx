import { useState } from "react";
import { expect, it } from "vitest";
import { cdp, page } from "vitest/browser";
import { render } from "vitest-browser-react";
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
