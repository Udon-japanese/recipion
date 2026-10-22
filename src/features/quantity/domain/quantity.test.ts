import { describe, expect, it } from "vitest";
import {
	formatQuantity,
	formatQuantityForUnit,
	formatStockAmount,
} from "./format-quantity";
import { parseQuantityInput } from "./parse-quantity-input";

describe("parseQuantityInput", () => {
	it.each([
		["1/2", 0.5],
		["1と1/2", 1.5],
		["1 1/2", 1.5],
		["１／４", 0.25],
		["½", 0.5],
		["1½", 1.5],
		["２¾", 2.75],
		["0.5", 0.5],
		[".5", 0.5],
		["3", 3],
		["  2  ", 2],
		["1/3", 0.333333],
		["1,000", 1000],
		["1,250.5", 1250.5],
	])("「%s」は %s", (input, expected) => {
		expect(parseQuantityInput(input)).toBe(expected);
	});

	it.each(["", "  ", "abc", "1/0", "-1", "1/2/3", "1..5"])(
		"「%s」は読めない（null）",
		(input) => {
			expect(parseQuantityInput(input)).toBeNull();
		},
	);
});

describe("formatQuantity", () => {
	it.each([
		[0.5, "1/2"],
		[1.5, "1 1/2"],
		[0.25, "1/4"],
		[0.75, "3/4"],
		[0.333333, "1/3"],
		[2.666667, "2 2/3"],
		[0.125, "1/8"],
		[3, "3"],
		[0, "0"],
		[0.2, "0.2"],
		[1250, "1,250"],
	])("%s は「%s」", (value, expected) => {
		expect(formatQuantity(value)).toBe(expected);
	});

	it("入力欄用（桁区切りなし）", () => {
		expect(formatQuantity(1000, { grouping: false })).toBe("1000");
		expect(formatQuantity(1.5, { grouping: false })).toBe("1 1/2");
	});

	it("分数を使わない指定のときは、小数のまま", () => {
		expect(formatQuantity(0.5, { allowFractions: false })).toBe("0.5");
	});

	it("書式と読み取りが、往復できる", () => {
		for (const value of [0.5, 1.5, 0.25, 0.75, 2.333333, 0.125, 4]) {
			expect(parseQuantityInput(formatQuantity(value))).toBeCloseTo(value, 5);
		}
	});
});

describe("formatQuantityForUnit", () => {
	it.each([
		// 保存された 1/3（0.333333）は、分数に戻す
		[0.333333, "本", "1/3"],
		[1.5, "個", "1 1/2"],
		[0.5, null, "1/2"],
		// 重さ・体積は、分数にしない
		[0.5, "kg", "0.5"],
		[1.5, "l", "1.5"],
		[250, "g", "250"],
	])("%s %s は %s", (value, unit, expected) => {
		expect(formatQuantityForUnit(value, unit)).toBe(expected);
	});
});

describe("formatStockAmount", () => {
	it.each([
		// 個数は分数、g・ml は丸める（10 以上は整数、未満は小数第1位）
		[0.333333, "count", "1/3"],
		[2, "count", "2"],
		[333.333, "g", "333"],
		[1200.4, "g", "1,200"],
		[9.96, "ml", "10"],
		[2.345, "ml", "2.3"],
		[0.5, "g", "0.5"],
	] as const)("%s %s は %s", (value, stockUnitCode, expected) => {
		expect(formatStockAmount(value, stockUnitCode)).toBe(expected);
	});
});
