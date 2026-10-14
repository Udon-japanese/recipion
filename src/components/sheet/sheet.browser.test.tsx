import { expect, it, vi } from "vitest";
import { cdp, page } from "vitest/browser";
import { render } from "vitest-browser-react";
import "../../styles.css";
import { useState } from "react";
import { Sheet } from "./sheet";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function Harness({
	onChange,
	snapPoints,
}: {
	onChange: (open: boolean) => void;
	snapPoints?: readonly number[];
}) {
	const [open, setOpen] = useState(true);

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				onChange(next);
				setOpen(next);
			}}
			title="在庫に追加"
			snapPoints={snapPoints}
		>
			<div data-testid="rows">
				{Array.from({ length: 40 }, (_, index) => (
					<p key={index.toString()} style={{ margin: 0, padding: 12 }}>
						行 {index + 1}
					</p>
				))}
			</div>
		</Sheet>
	);
}

function panel(): HTMLElement {
	const element = document.querySelector<HTMLElement>('[role="dialog"]');

	if (!element) {
		throw new Error("シートがありません");
	}

	return element;
}

function translateY(): number {
	const match = panel().style.transform.match(/translate3d\(0px, ([-\d.]+)px/u);

	return match ? Number(match[1]) : Number.NaN;
}

function scroller(): HTMLElement {
	const element = panel().querySelector<HTMLElement>("[data-scrollable]");

	if (!element) {
		throw new Error("本文がありません");
	}

	return element;
}

async function mouse(
	type: "mousePressed" | "mouseMoved" | "mouseReleased",
	x: number,
	y: number,
) {
	await cdp().send("Input.dispatchMouseEvent", {
		type,
		x,
		y,
		button: type === "mouseMoved" ? "none" : "left",
		buttons: type === "mouseReleased" ? 0 : 1,
		clickCount: 1,
	});
}

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

// つかみ（見出し）の位置。
function grabPoint() {
	const rect = panel().getBoundingClientRect();

	return { x: rect.left + rect.width / 2, y: rect.top + 12 };
}

it("つかみを、ゆっくり、大きく下げて離すと、閉じる", async () => {
	const onChange = vi.fn();

	await render(<Harness onChange={onChange} />);
	await sleep(600);

	const start = grabPoint();
	const height = panel().getBoundingClientRect().height;

	await mouse("mousePressed", start.x, start.y);
	for (let step = 1; step <= 10; step++) {
		await mouse("mouseMoved", start.x, start.y + (height * 0.5 * step) / 10);
		await sleep(40);
	}
	await sleep(150);
	await mouse("mouseReleased", start.x, start.y + height * 0.5);

	expect(onChange).toHaveBeenLastCalledWith(false);
});

it("少しだけ下げて離すと、元の位置へ戻る（閉じない）", async () => {
	const onChange = vi.fn();

	await render(<Harness onChange={onChange} />);
	await sleep(600);

	const start = grabPoint();
	const rest = translateY();

	await mouse("mousePressed", start.x, start.y);
	for (let step = 1; step <= 5; step++) {
		await mouse("mouseMoved", start.x, start.y + step * 8);
		await sleep(40);
	}
	await sleep(200);
	await mouse("mouseReleased", start.x, start.y + 40);
	await sleep(700);

	expect(onChange).not.toHaveBeenCalled();
	expect(translateY()).toBeCloseTo(rest, 0);
});

it("短い距離でも、速くはじくと、閉じる（フリック）", async () => {
	const onChange = vi.fn();

	await render(<Harness onChange={onChange} />);
	await sleep(600);

	const start = grabPoint();

	await mouse("mousePressed", start.x, start.y);
	await mouse("mouseMoved", start.x, start.y + 40);
	await mouse("mouseMoved", start.x, start.y + 90);
	await mouse("mouseMoved", start.x, start.y + 140);
	await mouse("mouseReleased", start.x, start.y + 140);

	expect(onChange).toHaveBeenLastCalledWith(false);
});

it("上へ引いても、いちばん高い位置を超えて動くのは、わずか（ゴムのように重い）", async () => {
	const onChange = vi.fn();

	await render(<Harness onChange={onChange} />);
	await sleep(600);

	const start = grabPoint();
	const rest = translateY();

	await mouse("mousePressed", start.x, start.y);
	for (let step = 1; step <= 7; step++) {
		await mouse("mouseMoved", start.x, start.y - step * 10);
		await sleep(30);
	}

	// 70px 引いても、動くのは、その半分以下（ゴムのように重い）。
	expect(rest - translateY()).toBeGreaterThan(10);
	expect(rest - translateY()).toBeLessThan(40);

	await mouse("mouseReleased", start.x, start.y - 70);
	await sleep(700);

	expect(onChange).not.toHaveBeenCalled();
	expect(translateY()).toBeCloseTo(rest, 0);
});

it("2段：上へはじくと、高い位置へ。下へはじくと、低い位置へ", async () => {
	const onChange = vi.fn();

	await render(<Harness onChange={onChange} snapPoints={[0.5, 0.9]} />);
	await sleep(600);

	const low = translateY();
	let start = grabPoint();

	await mouse("mousePressed", start.x, start.y);
	await mouse("mouseMoved", start.x, start.y - 40);
	await mouse("mouseMoved", start.x, start.y - 90);
	await mouse("mouseMoved", start.x, start.y - 140);
	await mouse("mouseReleased", start.x, start.y - 140);
	await sleep(700);

	const high = translateY();

	expect(high).toBeLessThan(low - 100);
	expect(onChange).not.toHaveBeenCalled();

	start = grabPoint();
	await mouse("mousePressed", start.x, start.y);
	await mouse("mouseMoved", start.x, start.y + 40);
	await mouse("mouseMoved", start.x, start.y + 90);
	await mouse("mouseMoved", start.x, start.y + 140);
	await mouse("mouseReleased", start.x, start.y + 140);
	await sleep(700);

	expect(translateY()).toBeCloseTo(low, 0);
	expect(onChange).not.toHaveBeenCalled();
});

it("本文が先頭にあるとき、指で下へ引くと、シートが下がる（閉じる）", async () => {
	const onChange = vi.fn();

	await render(<Harness onChange={onChange} />);
	await sleep(600);

	const rect = scroller().getBoundingClientRect();
	const x = rect.left + rect.width / 2;
	const y = rect.top + 40;

	await touch("touchStart", x, y);
	for (let step = 1; step <= 10; step++) {
		await touch("touchMove", x, y + step * 40);
		await sleep(30);
	}
	await sleep(150);
	await touch("touchEnd", x, y + 400);

	expect(onChange).toHaveBeenLastCalledWith(false);
});

it("本文をスクロールしているときは、指で下へ引いても、シートは動かず、本文がスクロールされる", async () => {
	const onChange = vi.fn();

	await render(<Harness onChange={onChange} />);
	await sleep(600);

	const body = scroller();

	body.scrollTop = 300;

	const rect = body.getBoundingClientRect();
	const x = rect.left + rect.width / 2;
	const y = rect.top + 100;
	const rest = translateY();

	await touch("touchStart", x, y);
	for (let step = 1; step <= 5; step++) {
		await touch("touchMove", x, y + step * 20);
		await sleep(30);
	}
	await touch("touchEnd", x, y + 100);
	await sleep(300);

	expect(onChange).not.toHaveBeenCalled();
	expect(translateY()).toBeCloseTo(rest, 0);
	expect(body.scrollTop).toBeLessThan(300);
});

it("暗幕を押すと閉じ、ボタンの操作（閉じる）でも閉じる", async () => {
	const onChange = vi.fn();

	await render(<Harness onChange={onChange} />);
	await sleep(600);

	await page.getByRole("button", { name: "閉じる" }).click();

	expect(onChange).toHaveBeenLastCalledWith(false);
});
