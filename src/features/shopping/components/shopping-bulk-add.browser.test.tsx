import { expect, it } from "vitest";
import { cdp, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { ShoppingBulkAdd } from "./shopping-bulk-add";

const MAC_CHROME_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

// 画面が低くて、カーソルの上に候補が入りきらなくても、変換中は、候補を縮めて、カーソルの上に置く（下に置くと、OS の変換候補の窓に重なる）。
it("変換中の候補は、上に余白が足りなくても、カーソルの行より下に出ない", async () => {
	// 変換中の補完は、Mac・Windows の Chromium 系だけで有効（Linux は確定後）。実行する環境（CI の Linux）によらず、Mac の Chrome として動かす。
	await cdp().send("Emulation.setUserAgentOverride", {
		userAgent: MAC_CHROME_USER_AGENT,
		userAgentMetadata: {
			brands: [{ brand: "Chromium", version: "140" }],
			platform: "macOS",
			platformVersion: "15.0.0",
			architecture: "arm",
			model: "",
			mobile: false,
		},
	});
	await page.viewport(1280, 640);
	await render(
		<ShoppingBulkAdd
			stores={[]}
			onClose={() => undefined}
			onAdd={async () => 0}
			onCreateStore={async () => null}
		/>,
	);

	const memo = document.querySelector("textarea") as HTMLTextAreaElement;

	memo.focus();
	await cdp().send("Input.imeSetComposition", {
		text: "たまね",
		selectionStart: 3,
		selectionEnd: 3,
	});

	await expect
		.poll(() => document.querySelector('[class*="completion-menu_popup"]'))
		.not.toBeNull();
	// 位置が決まるのを待つ。
	await new Promise((resolve) => setTimeout(resolve, 200));

	const menu = document.querySelector(
		'[class*="completion-menu_popup"]',
	) as HTMLElement;
	const box = memo.getBoundingClientRect();
	const style = getComputedStyle(memo);
	// 1行目の下端（入力欄の上端＋内側の余白＋1行）より、上に収まる。
	const firstLineBottom =
		box.top +
		Number.parseFloat(style.paddingTop) +
		Number.parseFloat(style.lineHeight || "24");

	expect(menu.getBoundingClientRect().bottom).toBeLessThanOrEqual(
		firstLineBottom,
	);
});
