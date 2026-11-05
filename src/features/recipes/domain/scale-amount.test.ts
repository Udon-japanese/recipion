import { describe, expect, it } from "vitest";
import {
	describeScaledAmount,
	roundScaledQuantity,
	scaleIngredientAmountText,
} from "./scale-amount";

describe("roundScaledQuantity", () => {
	it.each([
		// g・ml：10以上は整数、10未満は小数第1位
		[333.333, "g", 333],
		[7.55, "ml", 7.6],
		[0.01, "g", 0.1],
		// kg・l：小数第2位
		[0.7525, "kg", 0.75],
		// 大さじ・小さじ・カップ：1/4 刻み（1/4 より少なければ 1/8）
		[1.33, "大さじ", 1.25],
		[0.1, "小さじ", 0.125],
		// 個・本など：1/2 刻み（0 にはしない）
		[1.33, "個", 1.5],
		[0.2, "本", 0.25],
		// そのほか：1/4 刻み
		[0.66, null, 0.75],
	])("%d（%s）は %d", (value, unit, expected) => {
		expect(roundScaledQuantity(value, unit)).toBeCloseTo(expected);
	});
});

describe("describeScaledAmount", () => {
	it.each([
		[2, "個", "2個"],
		[1.3333, "個", "約1と1/2個"],
		[1.3333, "大さじ", "約大さじ1と1/4"],
		[150, "g", "150g"],
		[333.333, "g", "約333g"],
	])("%d（%s）は %s", (quantity, unit, expected) => {
		expect(describeScaledAmount(quantity, unit)).toBe(expected);
	});
});

describe("scaleIngredientAmountText", () => {
	it.each([
		{
			title: "割合が1なら、原文のまま",
			item: { quantity: 2, unitLabel: "個", amountText: "2コ" },
			ratio: 1,
			expected: "2コ",
		},
		{
			title: "数量に割合を掛ける",
			item: { quantity: 2, unitLabel: "個", amountText: "2個" },
			ratio: 0.5,
			expected: "1個",
		},
		{
			title: "範囲は、下限と上限に掛ける",
			item: { quantity: null, unitLabel: "g", amountText: "60~70g" },
			ratio: 0.5,
			expected: "30~35g",
		},
		{
			title: "数量にできない分量は、原文のまま",
			item: { quantity: null, unitLabel: null, amountText: "少々" },
			ratio: 2,
			expected: "少々",
		},
		{
			title: "括弧の補足は、元の分量として添える",
			item: { quantity: 1, unitLabel: "丁", amountText: "1丁(300g)" },
			ratio: 2,
			expected: "2丁（元：1丁(300g)）",
		},
		{
			title: "分量のない材料は、なし",
			item: { quantity: null, unitLabel: null, amountText: null },
			ratio: 2,
			expected: null,
		},
	])("$title", ({ item, ratio, expected }) => {
		expect(scaleIngredientAmountText(item, ratio)).toBe(expected);
	});
});
