import { describe, expect, it } from "vitest";
import {
	indicatorOffsetPx,
	PULL_INDICATOR_SIZE_PX,
	PULL_MAX_PX,
	PULL_RESISTANCE,
	PULL_THRESHOLD_PX,
	pullDistance,
	rollAngleDeg,
	shouldRefresh,
} from "./pull-refresh-physics";

describe("pullDistance", () => {
	it("上向きや動いていないときは、描く距離を 0 にする", () => {
		expect(pullDistance(0)).toBe(0);
		expect(pullDistance(-40)).toBe(0);
	});

	it("指の移動量に抵抗をかけ、上限で止める", () => {
		expect(pullDistance(100)).toBeCloseTo(100 * PULL_RESISTANCE);
		expect(pullDistance(10_000)).toBe(PULL_MAX_PX);
	});
});

describe("shouldRefresh", () => {
	it("しきい値ちょうどで更新し、手前では更新しない", () => {
		expect(shouldRefresh(PULL_THRESHOLD_PX)).toBe(true);
		expect(shouldRefresh(PULL_THRESHOLD_PX - 0.1)).toBe(false);
	});
});

describe("rollAngleDeg", () => {
	it("円周ぶん下りたら 1 回転して、角度は 360 未満に収まる", () => {
		const circumference = Math.PI * PULL_INDICATOR_SIZE_PX;

		expect(rollAngleDeg(0)).toBe(0);
		expect(rollAngleDeg(circumference)).toBeCloseTo(0);
		expect(rollAngleDeg(circumference / 2)).toBeCloseTo(180);
	});
});

describe("indicatorOffsetPx", () => {
	it("描く距離が 0 のとき、丸は画面の外に隠れる（丸の高さより上）", () => {
		expect(indicatorOffsetPx(0)).toBeLessThan(-PULL_INDICATOR_SIZE_PX);
	});
});
