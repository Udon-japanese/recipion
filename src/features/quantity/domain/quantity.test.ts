import { describe, expect, it } from "vitest";
import {
	formatAmountForUnit,
	formatAmounts,
	formatQuantity,
	formatQuantityForUnit,
	formatStockAmount,
	formatStockAmountWithUnit,
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
		// 分数にならない個数は、小数第1位まで（ロットの換算で、ぴったり引いたとき）
		[1.818182, "count", "1.8"],
		[3.181818, "count", "3.2"],
		[333.333, "g", "333"],
		[1200.4, "g", "1,200"],
		[9.96, "ml", "10"],
		[2.345, "ml", "2.3"],
		[0.5, "g", "0.5"],
	] as const)("%s %s は %s", (value, stockUnitCode, expected) => {
		expect(formatStockAmount(value, stockUnitCode)).toBe(expected);
	});
});

describe("formatAmountForUnit（1,000g 以上は kg、1,000ml・1,000cc 以上は L。表示だけ）", () => {
	it.each([
		{ quantity: 999, unit: "g", expected: "999g" },
		{ quantity: 1000, unit: "g", expected: "1kg" },
		{ quantity: 1250, unit: "g", expected: "1.25kg" },
		{ quantity: 1234, unit: "g", expected: "1.234kg" },
		{ quantity: 12345, unit: "g", expected: "12.345kg" },
		{ quantity: 1234567, unit: "g", expected: "1,234.567kg" },
		// 元の単位で書ける桁（小数6桁まで）は、kg にしても失わない。
		{ quantity: 1234.567891, unit: "g", expected: "1.234567891kg" },
		{ quantity: 1000.000001, unit: "g", expected: "1.000000001kg" },
		{ quantity: 1500, unit: "ml", expected: "1.5L" },
		{ quantity: 1500, unit: "mL", expected: "1.5L" },
		{ quantity: 2000, unit: "cc", expected: "2L" },
		// 1,000 未満の cc は、書いた単位のまま。
		{ quantity: 500, unit: "cc", expected: "500cc" },
		{ quantity: 999.5, unit: "ml", expected: "999.5ml" },
		{ quantity: -1500, unit: "g", expected: "-1.5kg" },
		{ quantity: -999, unit: "g", expected: "-999g" },
		// g・ml・cc 以外は、変えない。
		{ quantity: 0.5, unit: "kg", expected: "0.5kg" },
		{ quantity: 1500, unit: "個", expected: "1,500個" },
		{ quantity: 1500, unit: null, expected: "1,500" },
		{ quantity: 1 / 3, unit: "本", expected: "1/3本" },
	])("$quantity $unit → $expected", ({ quantity, unit, expected }) => {
		expect(formatAmountForUnit(quantity, unit)).toBe(expected);
	});
});

describe("formatAmounts（範囲の両端）", () => {
	const plain = (quantity: number) =>
		formatQuantity(quantity, { grouping: false, allowFractions: false });

	it.each([
		{ quantities: [800, 1200], unit: "g", expected: ["800", "1200", "g"] },
		{ quantities: [1000, 1500], unit: "g", expected: ["1", "1.5", "kg"] },
		{ quantities: [1250, 1333], unit: "ml", expected: ["1.25", "1.333", "L"] },
		{ quantities: [-1500, -1000], unit: "g", expected: ["-1.5", "-1", "kg"] },
		{ quantities: [-500, 1500], unit: "g", expected: ["-500", "1500", "g"] },
		{ quantities: [0, 1500], unit: "g", expected: ["0", "1500", "g"] },
		{
			quantities: [1000, Number.POSITIVE_INFINITY],
			unit: "g",
			expected: ["1000", "∞", "g"],
		},
		{ quantities: [1000, 1500], unit: "個", expected: ["1000", "1500", "個"] },
	])("$quantities $unit", ({ quantities, unit, expected }) => {
		const display = formatAmounts(quantities, unit, plain, {
			grouping: false,
		});

		expect([...display.texts, display.unitLabel]).toEqual(expected);
	});
});

describe("formatStockAmountWithUnit（在庫の量は、今の丸めのあとで切り替える）", () => {
	it.each([
		{ quantity: 1333.333, code: "g", unit: "g", expected: "1.333kg" },
		{ quantity: 999.6, code: "g", unit: "g", expected: "1kg" },
		{ quantity: 999.4, code: "g", unit: "g", expected: "999g" },
		{ quantity: 2500, code: "ml", unit: "ml", expected: "2.5L" },
		{ quantity: 1500, code: "count", unit: "個", expected: "1,500個" },
		{ quantity: 1 / 3, code: "count", unit: "個", expected: "1/3個" },
	] as const)(
		"$quantity $unit → $expected",
		({ quantity, code, unit, expected }) => {
			expect(formatStockAmountWithUnit(quantity, code, unit)).toBe(expected);
		},
	);
});
