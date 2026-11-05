import { describe, expect, it } from "vitest";
import { searchDishParts } from "./dish-part-search";

describe("searchDishParts", () => {
	it.each([
		{
			title: "名前の一部",
			query: "焼き",
			includes: ["卵焼き", "目玉焼き", "焼き魚"],
		},
		{
			title: "読み（漢字の名前を、かなで）",
			query: "からあげ",
			includes: ["唐揚げ"],
		},
		{
			title: "カタカナで打っても、ひらがなの読みに当たる",
			query: "ギョウザ",
			includes: ["餃子"],
		},
		{
			title: "ひらがなで打っても、カタカナの名前に当たる",
			query: "とまと",
			includes: ["トマト", "ミニトマト"],
		},
		{ title: "全角・半角の違いをなくす", query: "ｿｰｽ", includes: ["ソース"] },
	])("$title（$query）", ({ query, includes }) => {
		const labels = searchDishParts(query).map((part) => part.label);

		expect(labels).toEqual(expect.arrayContaining(includes));
	});

	it("空白で区切った語は、すべてを含むものだけ", () => {
		expect(searchDishParts("たまご　やき").map((part) => part.label)).toEqual([
			"卵焼き",
		]);
	});

	it("棚に出ない部品（在庫専用の缶詰）は、出さない", () => {
		const ids = searchDishParts("缶").map((part) => part.id);

		expect(ids).not.toContain("can");
		expect(ids).not.toContain("tomato-can");
	});

	it.each(["", "   ", "存在しない部品"])(
		"空・該当なしは、空の一覧（%j）",
		(query) => {
			expect(searchDishParts(query)).toEqual([]);
		},
	);
});
