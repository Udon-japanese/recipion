import { expect, it } from "vitest";
import { render } from "vitest-browser-react";
import "../../styles.css";
import { Button } from "./button";
import { useButtonAction } from "./use-button-action";

function Demo({ ok }: { ok: boolean }) {
	const action = useButtonAction();

	return (
		<Button
			status={action.status}
			successLabel="追加しました"
			onClick={() =>
				action.run(async () => {
					await new Promise((resolve) => setTimeout(resolve, 1000));
					return ok;
				})
			}
		>
			在庫に追加
		</Button>
	);
}

function button() {
	const element = document.querySelector("button");

	if (!element) {
		throw new Error("ボタンがありません");
	}

	return element;
}

const width = () => button().getBoundingClientRect().width;
const height = () => button().getBoundingClientRect().height;

// 実際のブラウザで、寸法の変化（縮む → 広がる → 戻る）を確かめる。
it("押すと、丸く縮み、完了で広がり、元の幅に戻る", async () => {
	await render(<Demo ok />);

	const idleWidth = width();
	const idleHeight = height();

	expect(idleWidth).toBeGreaterThan(idleHeight * 2);

	button().click();

	// 処理が長引くと、高さと同じ幅の丸になる（れしぽよを出す）。
	await expect
		.poll(() => button().dataset.phase, { timeout: 2000 })
		.toBe("loading");
	await expect
		.poll(() => width(), { timeout: 2000 })
		.toBeLessThan(idleHeight + 2);
	expect(button().getAttribute("aria-busy")).toBe("true");

	// 完了：丸のあと、文言の長さに広がる。
	await expect
		.poll(() => button().dataset.phase, { timeout: 3000 })
		.toBe("success-expanded");
	await expect
		.poll(() => width(), { timeout: 2000 })
		.toBeGreaterThan(idleHeight + 40);

	// 時間がたつと、元の形・元の幅に戻る。
	await expect
		.poll(() => button().dataset.phase, { timeout: 4000 })
		.toBe("idle");
	await expect
		.poll(() => Math.abs(width() - idleWidth), { timeout: 2000 })
		.toBeLessThan(2);
});

// 元の形に戻るとき、元の幅より狭く縮まない（形が変わってから測ると、横の余白の分だけ狭く覚えてしまう）。
it("元の形に戻るとき、元の幅より狭く縮まない", async () => {
	await render(<Demo ok />);

	const idleWidth = width();

	button().click();

	await expect
		.poll(() => button().dataset.phase, { timeout: 3000 })
		.toBe("success-expanded");
	await expect
		.poll(() => button().dataset.phase, { timeout: 4000 })
		.toBe("idle");

	// 戻りの動き（420ms）と、そのあとの大きさの手放し（500ms）をまたいで、幅を見続ける。
	let narrowest = Number.POSITIVE_INFINITY;
	const end = performance.now() + 1000;

	while (performance.now() < end) {
		narrowest = Math.min(narrowest, width());
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}

	expect(narrowest).toBeGreaterThan(idleWidth - 2);
});

it("失敗のときは、赤い印の形になる", async () => {
	await render(<Demo ok={false} />);

	button().click();

	await expect
		.poll(() => button().dataset.tone, { timeout: 3000 })
		.toBe("error");
	await expect
		.poll(() => button().dataset.phase, { timeout: 3000 })
		.toBe("error-expanded");
});
