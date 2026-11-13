import { expect, it, vi } from "vitest";
import { cdp } from "vitest/browser";
import { render } from "vitest-browser-react";
import "../../../styles.css";
import { PullRefresh } from "./pull-refresh";

// 実際の指の操作（CDP の touch 入力）で、引っ張り更新の判定を確かめる。
// 指の移動量は、描く距離の割合（0.6）の逆数で見る：描く距離 80px には、指で約 134px。

async function touch(
	type: "touchStart" | "touchMove" | "touchEnd",
	x: number,
	y: number,
) {
	await cdp().send("Input.dispatchTouchEvent", {
		type,
		touchPoints: type === "touchEnd" ? [] : [{ x, y }],
	});
}

// 上から下へ、指で distancePx ぶん引いて離す。
async function pullDown(distancePx: number) {
	const x = 200;
	const startY = 200;
	const steps = 10;

	await touch("touchStart", x, startY);

	for (let step = 1; step <= steps; step += 1) {
		await touch("touchMove", x, startY + (distancePx * step) / steps);
	}

	await touch("touchEnd", x, startY + distancePx);
}

it("しきい値まで引いて離すと、更新を1回頼む", async () => {
	const onRefresh = vi.fn(() => Promise.resolve());

	await render(<PullRefresh onRefresh={onRefresh} />);
	await pullDown(220);

	await vi.waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
});

it("しきい値の手前で離したときは、更新を頼まない", async () => {
	const onRefresh = vi.fn(() => Promise.resolve());

	await render(<PullRefresh onRefresh={onRefresh} />);
	await pullDown(60);
	await new Promise((resolve) => setTimeout(resolve, 800));

	expect(onRefresh).not.toHaveBeenCalled();
});
