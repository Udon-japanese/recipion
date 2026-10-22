import { expect, it } from "vitest";
import { cdp } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ShoppingItemForm } from "./shopping-item-form";

// 実際のブラウザの変換（IME）のイベントで、買い物メモの追加フォームの食材名の候補を確かめる。
it("変換中は、カタログの名前と完全に一致しても、候補が出たままになる（買い物メモの追加フォーム）", async () => {
	await render(
		<ShoppingItemForm
			errorMessage={null}
			stores={[]}
			defaultStoreIdFor={() => null}
			onCreateStore={async () => null}
			onAdd={async () => true}
		/>,
	);

	const input = document.querySelector(
		'input[role="combobox"]',
	) as HTMLInputElement;

	input.focus();

	for (const text of ["に", "にん", "にんに", "にんにく"]) {
		await cdp().send("Input.imeSetComposition", {
			text,
			selectionStart: text.length,
			selectionEnd: text.length,
		});
		await new Promise((resolve) => setTimeout(resolve, 100));

		expect(
			document.querySelector('[role="listbox"]'),
			`「${text}」で候補が出る（入力欄の値：${input.value}）`,
		).not.toBeNull();
	}
});
