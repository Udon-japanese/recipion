import { expect, it } from "vitest";
import { cdp, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ShoppingAddSheet } from "./shopping-add-sheet";

// 実際のブラウザの変換（IME）のイベントで、追加シートの食材名の候補を確かめる。
it("変換中は、カタログの名前と完全に一致しても、候補が出たままになる（買い物メモの追加シート）", async () => {
	await render(
		<ShoppingAddSheet
			title="買うものを入れる"
			stores={[]}
			defaultStoreIdFor={() => null}
			onCreateStore={async () => null}
			onAdd={async () => true}
			onClose={() => undefined}
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
			document.querySelector('[role="listbox"], [aria-label="補完の候補"]'),
			`「${text}」で候補が出る（入力欄の値：${input.value}）`,
		).not.toBeNull();
	}
});

// 店を足す欄は、狭いスマホの幅でも、入力欄とボタンが重ならない。
it("狭い幅でも、新しい店の入力欄とボタンが重ならない", async () => {
	await page.viewport(320, 700);
	await render(
		<ShoppingAddSheet
			title="買うものを入れる"
			stores={[]}
			defaultStoreIdFor={() => null}
			onCreateStore={async () => null}
			onAdd={async () => true}
			onClose={() => undefined}
		/>,
	);
	await new Promise((resolve) => setTimeout(resolve, 600));

	const open = [...document.querySelectorAll("button")].find((button) =>
		button.textContent?.includes("店を足す"),
	);

	open?.click();
	await new Promise((resolve) => setTimeout(resolve, 200));

	const input = document
		.querySelector('input[aria-label="新しい店の名前"]')
		?.getBoundingClientRect();
	const buttons = [...document.querySelectorAll("button")]
		.filter((button) => /この店を追加|やめる/.test(button.textContent ?? ""))
		.map((button) => button.getBoundingClientRect());

	expect(buttons).toHaveLength(2);
	expect(input?.bottom).toBeLessThanOrEqual(
		Math.min(...buttons.map((rect) => rect.top)),
	);
	// 2つのボタンどうしも、重ならない。
	expect(buttons[0]?.right).toBeLessThanOrEqual(buttons[1]?.left ?? 0);
});
