import { describe, expect, it } from "vitest";
import { resolveWantedYield, usesHouseholdSize } from "./household-size";

describe("usesHouseholdSize", () => {
	it.each([
		[{ yieldText: "2人分" }, true],
		[{ yieldText: "4人前" }, false],
		[{ yieldText: "12個" }, false],
		[{ yieldText: "18cmの型1台" }, false],
		[{ yieldText: "作りやすい分量" }, false],
		[{ yieldText: "2人分", scalable: false }, false],
	])("%j は %s", (recipe, expected) => {
		expect(usesHouseholdSize(recipe)).toBe(expected);
	});
});

describe("resolveWantedYield", () => {
	it.each([
		{
			title: "URL の ?n= がいちばん先",
			recipe: { yieldText: "2人分" },
			urlWanted: 5,
			householdSize: 3,
			expected: 5,
		},
		{
			title: "?n= がなければ、うちの人数",
			recipe: { yieldText: "2人分" },
			urlWanted: undefined,
			householdSize: 3,
			expected: 3,
		},
		{
			title: "うちの人数がなければ、レシピの量のまま",
			recipe: { yieldText: "2人分" },
			urlWanted: undefined,
			householdSize: null,
			expected: undefined,
		},
		{
			title: "「人分」でないレシピには、うちの人数を使わない",
			recipe: { yieldText: "12個" },
			urlWanted: undefined,
			householdSize: 3,
			expected: undefined,
		},
		{
			title: "「人分」でないレシピも、?n= は使う",
			recipe: { yieldText: "12個" },
			urlWanted: 6,
			householdSize: 3,
			expected: 6,
		},
		{
			title: "「この分量で作る」レシピは、いつもレシピの量",
			recipe: { yieldText: "2人分", scalable: false },
			urlWanted: 5,
			householdSize: 3,
			expected: undefined,
		},
	])("$title", ({ recipe, urlWanted, householdSize, expected }) => {
		expect(resolveWantedYield({ recipe, urlWanted, householdSize })).toBe(
			expected,
		);
	});
});
