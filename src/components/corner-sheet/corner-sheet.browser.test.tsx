import { expect, it } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import "../../styles.css";
import { CornerSheet } from "./corner-sheet";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function Long() {
	return (
		<CornerSheet
			open
			title="買うものを入れる"
			actions="inline"
			left={{ label: "完了", icon: "check", onClick: () => undefined }}
			right={{ label: "追加", icon: "plus", onClick: () => undefined }}
		>
			{Array.from({ length: 30 }, (_, index) => (
				<p key={index.toString()} style={{ margin: 0, padding: 12 }}>
					行 {index + 1}
				</p>
			))}
		</CornerSheet>
	);
}

// キーボードが出ると、見える範囲が低くなる。カードの中のボタンは、その中に収まって、押せる。
it("スマホで、入力用（inline）のボタンは、見える範囲が低くても、カードの下端に見えている", async () => {
	await page.viewport(375, 360);
	await render(<Long />);
	await sleep(600);

	// 右（進む）のボタン。
	const button = document.querySelector<HTMLElement>("button[data-autofocus]");
	const bottom = button?.getBoundingClientRect().bottom ?? Number.NaN;

	expect(bottom).toBeLessThanOrEqual(360);
	// 角のボタンは、出ない。
	expect(document.querySelector('[aria-label="追加"]')).toBeNull();
});
