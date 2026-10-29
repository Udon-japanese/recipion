import { describe, expect, it } from "vitest";
import {
	boundsCorners,
	canvasToPlacement,
	isInsideBounds,
	placementToCanvas,
} from "./dish-placement-geometry";

const bounds = { x: 20, y: 30, width: 60, height: 40 };

describe("placementToCanvas / canvasToPlacement", () => {
	it("等倍で回転なしなら、中心が置いた位置に重なる", () => {
		expect(
			placementToCanvas({ partId: "rice", x: 30, y: 40 }, { x: 50, y: 50 }),
		).toEqual({ x: 30, y: 40 });
	});

	it("拡大・回転・反転しても、往復すると元に戻る", () => {
		const placement = {
			partId: "rice",
			x: 40,
			y: 55,
			scale: 0.6,
			rotate: 35,
			flip: true,
		};
		const local = { x: 22, y: 71 };
		const back = canvasToPlacement(
			placement,
			placementToCanvas(placement, local),
		);

		expect(back.x).toBeCloseTo(local.x);
		expect(back.y).toBeCloseTo(local.y);
	});
});

describe("boundsCorners", () => {
	it("拡大した部品の四隅を、絵の上で返す", () => {
		const [topLeft, , bottomRight] = boundsCorners(
			{ partId: "rice", x: 50, y: 50, scale: 0.5 },
			bounds,
		);

		expect(topLeft).toEqual({ x: 35, y: 40 });
		expect(bottomRight).toEqual({ x: 65, y: 60 });
	});
});

describe("isInsideBounds", () => {
	const placement = { partId: "rice", x: 50, y: 50 };

	it("範囲の中は true、外は false", () => {
		expect(isInsideBounds(placement, bounds, { x: 50, y: 50 })).toBe(true);
		expect(isInsideBounds(placement, bounds, { x: 90, y: 90 })).toBe(false);
	});

	it("余裕の分だけ、外側も true", () => {
		expect(isInsideBounds(placement, bounds, { x: 83, y: 50 })).toBe(false);
		expect(isInsideBounds(placement, bounds, { x: 83, y: 50 }, 4)).toBe(true);
	});
});
