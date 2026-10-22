import { useState } from "react";
import { expect, it } from "vitest";
import { cdp } from "vitest/browser";
import { render } from "vitest-browser-react";
import { IngredientNameInput } from "./ingredient-name-input";

function Harness() {
	const [value, setValue] = useState("");

	return <IngredientNameInput id="name" value={value} onChange={setValue} />;
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
