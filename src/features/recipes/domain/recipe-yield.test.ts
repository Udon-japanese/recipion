import { describe, expect, it } from "vitest";
import {
	parseRecipeYield,
	ratioForYield,
	scaleRecipeYieldText,
	stepRecipeYield,
} from "./recipe-yield";

describe("parseRecipeYield", () => {
	it.each([
		["4人分", { prefix: "", quantity: 4, suffix: "人分" }],
		["12個", { prefix: "", quantity: 12, suffix: "個" }],
		[
			"18cmのパウンド型1台",
			{ prefix: "18cmのパウンド型", quantity: 1, suffix: "台" },
		],
		["１．５人分", { prefix: "", quantity: 1.5, suffix: "人分" }],
		["1/2本分", { prefix: "", quantity: 0.5, suffix: "本分" }],
	])("%s は、最後の数を基準に読む", (text, expected) => {
		expect(parseRecipeYield(text)).toEqual(expected);
	});

	it.each(["作りやすい分量", "2〜3人分", "2~3人分", "2から3人分", "0人分", ""])(
		"%s は、増減しない（null）",
		(text) => {
			expect(parseRecipeYield(text)).toBeNull();
		},
	);
});

describe("stepRecipeYield", () => {
	it.each([
		["4人分", 1, "5人分"],
		["4人分", -1, "3人分"],
		["18cmの型1台", 1, "18cmの型2台"],
		["1/2本分", 1, "1と1/2本分"],
	])("%s を %i すると %s", (text, delta, expected) => {
		expect(stepRecipeYield(text, delta)).toBe(expected);
	});

	it.each([
		["1人分", -1],
		["作りやすい分量", 1],
	])("%s は %i できない（null）", (text, delta) => {
		expect(stepRecipeYield(text, delta)).toBeNull();
	});
});

describe("scaleRecipeYieldText", () => {
	it.each([
		["4人分", 1, "4人分"],
		["4人分", 0.5, "2人分"],
		["12個", 1.5, "18個"],
		["18cmの型1台", 0.5, "18cmの型1/2台"],
		["作りやすい分量", 2, "作りやすい分量の2倍"],
		["作りやすい分量", 0.5, "作りやすい分量の1/2倍"],
	])("%s の %d 倍は %s", (text, ratio, expected) => {
		expect(scaleRecipeYieldText(text, ratio)).toBe(expected);
	});
});

describe("ratioForYield", () => {
	it.each([
		["4人分", 2, 0.5],
		["4人分", 6, 1.5],
		["4人分", undefined, 1],
		["作りやすい分量", 2, 1],
		["4人分", 0, 1],
	])("%s を %s で見ると、割合は %d", (text, wanted, expected) => {
		expect(ratioForYield(text, wanted)).toBe(expected);
	});
});
