import { describe, expect, it } from "vitest";
import { filterLinkTargets } from "./filter-link-targets";

const targets = [
	{ publicId: "1", name: "ミニトマトのマリネ" },
	{ publicId: "2", name: "トマトカレー" },
	{ publicId: "3", name: "ハンバーグ" },
	{ publicId: "4", name: "カレーうどん" },
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
