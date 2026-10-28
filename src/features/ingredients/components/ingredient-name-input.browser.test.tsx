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
