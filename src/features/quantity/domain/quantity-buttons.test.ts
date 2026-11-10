import { describe, expect, it } from "vitest";
import {
	applyQuantityButton,
	describeQuantityButton,
	getQuantityButtons,
	getShareQuantityPresets,
	initialQuantityInput,
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

describe("initialQuantityInput", () => {
	it.each([
		["g", ""],
		["ml", ""],
		["個", "1"],
		["枚", "1"],
		[null, "1"],
	])(
		"%s のはじめの値は「%s」（足すボタンがある単位は空）",
		(unit, expected) => {
			expect(initialQuantityInput(unit)).toBe(expected);
		},
	);
});

describe("getShareQuantityPresets", () => {
	const describePresets = (available: number, unit: string | null) =>
		getShareQuantityPresets(available, unit).map(
			(preset) => `${preset.label}=${preset.value}`,
		);

	it("端数を使う単位は、いまある量の半分・1/3・1/4 を、分数で返す", () => {
		expect(describePresets(3, "玉")).toEqual([
			"半分=1 1/2",
			"1/3=1",
			"1/4=3/4",
		]);
		expect(describePresets(10, "個")).toEqual([
			"半分=5",
			"1/3=3 1/3",
			"1/4=2 1/2",
		]);
	});

	it("在庫が 0 以下なら、出さない", () => {
		expect(describePresets(0, "玉")).toEqual([]);
		expect(describePresets(-1, "玉")).toEqual([]);
	});

	it("きれいな分数にならない量は、そのボタンだけ出さない（3.5個の 1/3 など）", () => {
		expect(describePresets(3.5, "個")).toEqual(["半分=1 3/4", "1/4=7/8"]);
	});

	it("g・ml や、端数にしない単位・知らない単位は、出さない", () => {
		for (const unit of ["g", "ml", "袋", "枚", "", null]) {
			expect(describePresets(6, unit)).toEqual([]);
		}
	});
});
