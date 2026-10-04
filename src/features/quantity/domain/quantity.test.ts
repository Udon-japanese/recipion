import { describe, expect, it } from "vitest";
import { formatQuantity } from "./format-quantity";
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

	it.each([
		"",
		"  ",
		"abc",
		"1/0",
		"-1",
		"1/2/3",
		"1..5",
	])("「%s」は読めない（null）", (input) => {
		expect(parseQuantityInput(input)).toBeNull();
	});
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
