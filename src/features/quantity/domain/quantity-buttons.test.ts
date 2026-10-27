import { describe, expect, it } from "vitest";
import {
	applyQuantityButton,
	describeQuantityButton,
	getQuantityButtons,
} from "./quantity-buttons";

const cases: [unit: string | null | undefined, expected: string[]][] = [
	["玉", ["1/4", "1/3", "1/2", "3/4"]],
	["株", ["1/4", "1/3", "1/2", "3/4"]],
	["本", ["1/3", "1/2", "2/3"]],
	["個", ["1/2"]],
	["丁", ["1/2"]],
	["回分", ["1/4", "1/3", "1/2", "3/4"]],
	["カップ", ["1/4", "1/2", "3/4"]],
	["g", ["+10", "+50", "+100", "+200", "+500"]],
	["G", ["+10", "+50", "+100", "+200", "+500"]],
	["ml", ["+50", "+100", "+200", "+500"]],
	// 端数にしない単位、知らない単位、空
	["枚", []],
	["袋", []],
	["kg", []],
	["", []],
	[null, []],
	[undefined, []],
];

describe("getQuantityButtons", () => {
	it.each(cases)("%s", (unit, expected) => {
		expect(getQuantityButtons(unit).map(describeQuantityButton)).toEqual(
			expected,
		);
	});
});

describe("applyQuantityButton", () => {
	it("set は値を置き換え、add は足す（読めない値は 0 として）", () => {
		expect(applyQuantityButton("5", { kind: "set", value: "1/2" })).toBe("1/2");
		expect(applyQuantityButton("", { kind: "add", amount: 50 })).toBe("50");
		expect(applyQuantityButton("100", { kind: "add", amount: 50 })).toBe("150");
		expect(applyQuantityButton("1,000", { kind: "add", amount: 500 })).toBe(
			"1500",
		);
		expect(applyQuantityButton("abc", { kind: "add", amount: 50 })).toBe("50");
	});
});
