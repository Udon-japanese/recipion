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
			title: "括弧の言い換えの分量も、同じ割合で掛ける",
			item: { quantity: 1, unitLabel: "丁", amountText: "1丁(300g)" },
			ratio: 2,
			expected: "2丁(600g)",
		},
		{
			title: "言い換えも、丸めたら「約」を付ける",
			item: { quantity: 1, unitLabel: "枚", amountText: "1枚(約250g)" },
			ratio: 1 / 3,
			expected: "約1/2枚(約83g)",
		},
		{
			title: "言い換えが範囲なら、下限と上限を掛ける",
			item: { quantity: 1, unitLabel: "枚", amountText: "1枚(200~250g)" },
			ratio: 2,
			expected: "2枚(400~500g)",
		},
		{
			title: "分量でない括弧の補足は、そのまま付ける",
			item: { quantity: 1, unitLabel: "丁", amountText: "1丁(木綿)" },
			ratio: 2,
			expected: "2丁(木綿)",
		},
		{
			title: "割合の単位（人分）の括弧は、言い換えにしない",
			item: { quantity: 4, unitLabel: "個", amountText: "4個(2人分)" },
			ratio: 2,
			expected: "8個(2人分)",
		},
		{
			title: "増減のしかた（やや控えめ）を掛ける：2倍で1.8倍",
			item: {
				quantity: 10,
				unitLabel: "g",
				amountText: "10g",
				scaleWeight: 0.8,
			},
			ratio: 2,
			expected: "18g",
		},
		{
			title: "固定の材料は、量を変えても原文のまま",
			item: { quantity: 1, unitLabel: "個", amountText: "1個", scaleWeight: 0 },
			ratio: 3,
			expected: "1個",
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
