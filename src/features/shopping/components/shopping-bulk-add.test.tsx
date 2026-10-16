import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShoppingBulkAdd } from "./shopping-bulk-add";

// 変換中の補完の方式は、環境ごとに決まる。ここでは、Mac の Chrome（変換を確定させてから置き換える）にする。
vi.mock("#/ime/read-browser-environment", () => ({
	readBrowserEnvironment: () => ({
		userAgent: "Mozilla/5.0 (Macintosh) Chrome/130",
		maxTouchPoints: 0,
		isChromium: true,
	}),
}));

function renderBulkAdd() {
	render(
		<ShoppingBulkAdd
			stores={[]}
			onClose={() => undefined}
			onAdd={async () => 0}
			onCreateStore={async () => null}
		/>,
	);

	return screen.getByRole("textbox", { name: "買うもの（1行に1つ）" });
}

describe("ShoppingBulkAdd の変換中の補完", () => {
	it("変換中でも、Alt+↓で候補を選び、Tab で、変換を確定させて置き換える", async () => {
		const memo = renderBulkAdd() as HTMLTextAreaElement;

		memo.focus();
		fireEvent.compositionStart(memo);
		fireEvent.change(memo, { target: { value: "たまね" } });
		memo.setSelectionRange(3, 3);
		fireEvent.select(memo);

		const list = await screen.findByRole("list", { name: "補完の候補" });

		expect(list).toBeTruthy();

		// 素の矢印は IME に任せる（候補は動かない）。Alt+↓ で選ぶ。
		fireEvent.keyDown(memo, { key: "ArrowDown", isComposing: true });
		fireEvent.keyDown(memo, {
			key: "ArrowDown",
			altKey: true,
			isComposing: true,
		});

		const tab = fireEvent.keyDown(memo, {
			key: "Tab",
			code: "Tab",
			isComposing: true,
		});

		// Tab は IME に渡さない（既定の動作を止めた）。
		expect(tab).toBe(false);
		await waitFor(() => expect(memo.value).not.toBe("たまね"));
		expect(memo.value).toMatch(/^(玉ねぎ|たまねぎ|玉葱)/u);
	});
});
