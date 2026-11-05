import { describe, expect, it } from "vitest";
import { scaleWeightLabel, weightedRatio } from "./scale-weight";

describe("weightedRatio", () => {
	it.each([
		// [割合, 重み, 結果]
		[2, 1, 2],
		[2, 0.8, 1.8],
		[2, 0.5, 1.5],
		[2, 0, 1],
		[0.5, 1, 0.5],
		[0.5, 0.8, 0.6],
		[0.5, 0.5, 0.75],
		[0.5, 0, 1],
		[2, undefined, 2],
	])("割合 %d・重み %s は %d 倍", (ratio, weight, expected) => {
		expect(weightedRatio(ratio, weight)).toBeCloseTo(expected);
	});
});

describe("scaleWeightLabel", () => {
	it.each([
		[undefined, null],
		[1, null],
		[0.8, "やや控えめ"],
		[0.5, "半分だけ"],
		[0, "固定"],
	])("%s は %s", (weight, expected) => {
		expect(scaleWeightLabel(weight)).toBe(expected);
	});
});
