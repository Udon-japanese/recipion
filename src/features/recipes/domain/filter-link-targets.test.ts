import { describe, expect, it } from "vitest";
import {
	filterLinkTargets,
	putSimilarTargetsFirst,
} from "./filter-link-targets";

const targets = [
	{
		publicId: "1",
		name: "ミニトマトのマリネ",
		createdAt: "2026-10-01T00:00:00+09:00",
	},
	{
		publicId: "2",
		name: "トマトカレー",
		createdAt: "2026-10-01T00:00:00+09:00",
	},
	{ publicId: "3", name: "ハンバーグ", createdAt: "2026-10-01T00:00:00+09:00" },
	{
		publicId: "4",
		name: "カレーうどん",
		createdAt: "2026-10-01T00:00:00+09:00",
	},
];

describe("filterLinkTargets", () => {
	it("前方一致を先に、部分一致をそのあとに並べる", () => {
		expect(filterLinkTargets(targets, "トマト", 10).map((t) => t.name)).toEqual(
			["トマトカレー", "ミニトマトのマリネ"],
		);
	});

	it("ひらがなでも、全角・半角の違いでも、探せる", () => {
		expect(filterLinkTargets(targets, "とまと", 10)).toHaveLength(2);
		expect(filterLinkTargets(targets, "かれー", 10).map((t) => t.name)).toEqual(
			["カレーうどん", "トマトカレー"],
		);
	});

	it("入力が空なら、すべて（元の順）。上限で切る", () => {
		expect(filterLinkTargets(targets, "  ", 10).map((t) => t.publicId)).toEqual(
			["1", "2", "3", "4"],
		);
		expect(filterLinkTargets(targets, "", 2)).toHaveLength(2);
	});

	it("一致がなければ、空", () => {
		expect(filterLinkTargets(targets, "ラーメン", 10)).toEqual([]);
	});
});

describe("putSimilarTargetsFirst", () => {
	it.each([
		{
			name: "カレー",
			expected: [
				"トマトカレー",
				"カレーうどん",
				"ミニトマトのマリネ",
				"ハンバーグ",
			],
		},
		{
			name: "はんばーぐ",
			expected: [
				"ハンバーグ",
				"ミニトマトのマリネ",
				"トマトカレー",
				"カレーうどん",
			],
		},
		{
			name: "煮込みハンバーグ",
			expected: [
				"ハンバーグ",
				"ミニトマトのマリネ",
				"トマトカレー",
				"カレーうどん",
			],
		},
		{
			name: "",
			expected: [
				"ミニトマトのマリネ",
				"トマトカレー",
				"ハンバーグ",
				"カレーうどん",
			],
		},
	])(
		"呼び名「$name」に似たレシピを、先に並べる（ほかは元の順）",
		({ name, expected }) => {
			expect(putSimilarTargetsFirst(targets, name).map((t) => t.name)).toEqual(
				expected,
			);
		},
	);
});
