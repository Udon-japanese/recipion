import { afterEach, expect, it } from "vitest";
import { cdp } from "vitest/browser";
import { render } from "vitest-browser-react";
import "../../styles.css";
import { resetToastsForTest, showToast } from "./toast-store";
import { ToastViewport } from "./toast-viewport";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() => resetToastsForTest());

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

function toastElement(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-toast-id="t"]');
}

function translateY(element: HTMLElement): number {
	return new DOMMatrixReadOnly(getComputedStyle(element).transform).m42;
}

async function dragBy(dy: number) {
	const element = toastElement();

	if (!element) {
		throw new Error("お知らせがありません");
	}

	const rect = element.getBoundingClientRect();
	const x = rect.left + 12;
	const y = rect.top + rect.height / 2;

	// 画面の外へは動かせないので、上端（1px）で止める。
	const endY = Math.max(1, y + dy);

	await mouse("mousePressed", x, y);
	for (let step = 1; step <= 8; step++) {
		await mouse("mouseMoved", x, y + ((endY - y) * step) / 8);
		await sleep(30);
	}

	return { x, endY, element };
}

async function showAndSettle() {
	await render(<ToastViewport />);
	showToast({ id: "t", message: "在庫を更新しました", duration: null });
	await sleep(400);
}

it("上へ動かすと、指に付いて動き、離すと消える", async () => {
	await showAndSettle();

	const { x, endY, element } = await dragBy(-40);

	// お知らせは画面の上端にあるので、指は上端までしか動かない。その分だけ、付いて動く。
	expect(translateY(element)).toBeLessThan(-20);

	await sleep(120);
	await mouse("mouseReleased", x, endY);

	await expect.poll(() => toastElement()).toBeNull();
});

it("下へ引くと、少しで止まり、離すと上へ消える", async () => {
	await showAndSettle();

	const { x, endY, element } = await dragBy(120);

	// 下へは、上限（28px）より先へは動かない。
	expect(translateY(element)).toBeGreaterThan(0);
	expect(translateY(element)).toBeLessThan(28);

	await mouse("mouseReleased", x, endY);
	await sleep(80);

	// 消えるときは、上へ動く。
	expect(translateY(element)).toBeLessThan(0);
	await expect.poll(() => toastElement()).toBeNull();
});

it("少しだけ動かして離すと、元の位置へ戻る（消えない）", async () => {
	await showAndSettle();

	const { x, endY, element } = await dragBy(12);

	await sleep(150);
	await mouse("mouseReleased", x, endY);
	await sleep(400);

	expect(toastElement()).not.toBeNull();
	expect(translateY(element)).toBeCloseTo(0, 0);
});
