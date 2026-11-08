import { describe, expect, it } from "vitest";
import {
	DOWN_PULL_LIMIT,
	displayToastOffset,
	resolveToastRelease,
} from "./toast-physics";

describe("displayToastOffset", () => {
	it("上へは、指のとおりに動く", () => {
		expect(displayToastOffset(-40)).toBe(-40);
	});

	it("下へは、ゴムのように重く、どれだけ引いても上限で止まる", () => {
		expect(displayToastOffset(20)).toBeLessThan(20);
		expect(displayToastOffset(1000)).toBeLessThan(DOWN_PULL_LIMIT);
		expect(displayToastOffset(1000)).toBeGreaterThan(DOWN_PULL_LIMIT * 0.9);
	});
});

describe("resolveToastRelease", () => {
	it.each([
		{ raw: -30, velocity: 0, expected: "dismiss", note: "上へ十分に動かした" },
		{ raw: -8, velocity: -0.6, expected: "dismiss", note: "上へ速くはじいた" },
		{ raw: -8, velocity: -0.1, expected: "stay", note: "上へ少しだけ" },
		{
			raw: 60,
			velocity: 0,
			expected: "dismiss",
			note: "下へ十分に引いた（上へ消す）",
		},
		{ raw: 20, velocity: 0.5, expected: "stay", note: "下へ少しだけ" },
	] as const)("$note → $expected", ({ raw, velocity, expected }) => {
		expect(resolveToastRelease({ raw, velocity })).toBe(expected);
	});
});
