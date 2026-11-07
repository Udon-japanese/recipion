import { describe, expect, it } from "vitest";
import {
	buildLikePatterns,
	findPublicTagsMatchingTerm,
	formatSearchCursor,
	maxSearchTermLength,
	maxSearchTerms,
	parseRecipeSearchTerms,
	parseSearchCursor,
	parseSearchTags,
} from "./public-recipe-search";

describe("parseRecipeSearchTerms", () => {
	it.each([
		["", []],
		["   ", []],
		["親子丼", ["親子丼"]],
		["親子丼　卵", ["親子丼", "卵"]],
		["ｶﾚｰ  ＣＡＲＲＹ", ["カレー", "CARRY"]],
		["卵 卵 卵", ["卵"]],
	])("%j を、検索語に分ける", (query, expected) => {
		expect(parseRecipeSearchTerms(query)).toEqual(expected);
	});

	it("検索語の数と長さに、上限がある", () => {
		expect(parseRecipeSearchTerms("a b c d e f")).toHaveLength(maxSearchTerms);
		expect(parseRecipeSearchTerms("あ".repeat(100))[0]).toHaveLength(
			maxSearchTermLength,
		);
	});
});

describe("buildLikePatterns", () => {
	it("ひらがなとカタカナの、どちらの形でも探す", () => {
		expect(buildLikePatterns("とろとろ")).toEqual(["%とろとろ%", "%トロトロ%"]);
		expect(buildLikePatterns("カレー")).toEqual(["%カレー%", "%かれー%"]);
	});

	it("漢字や英数字は、そのまま1つ", () => {
		expect(buildLikePatterns("親子丼")).toEqual(["%親子丼%"]);
	});

	it("LIKE の特殊文字は、文字として扱う", () => {
		expect(buildLikePatterns("100%_\\")).toEqual(["%100\\%\\_\\\\%"]);
	});
});

describe("検索の続きの取り方", () => {
	const cursor = {
		createdAt: "2026-10-23 03:21:09.123456+00",
		publicId: "abc_DEF-123",
	};

	it("書き出した値を、読み戻せる", () => {
		expect(parseSearchCursor(formatSearchCursor(cursor))).toEqual(cursor);
	});

	it.each([
		"",
		"abc",
		"2026-10-23|x",
		"2026-10-23 03:21:09+00|",
		"2026-10-23 03:21:09+00|a b",
		"2026-10-23 03:21:09+00'; drop table recipe;--|x",
	])("形の違う値（%j）は、読まない", (value) => {
		expect(parseSearchCursor(value)).toBeNull();
	});
});

describe("findPublicTagsMatchingTerm", () => {
	it.each([
		{ term: "時短", expected: ["quick"] },
		// ひらがなとカタカナ、全角と半角を区別しない。
		{ term: "ぴり辛", expected: ["hot_spicy"] },
		{ term: "ﾜﾝﾊﾟﾝ", expected: ["one_pan"] },
		// 表示名の一部でも当たる。
		{
			term: "向き",
			expected: [
				"make_ahead",
				"batch_cooking",
				"beginner",
				"bento",
				"kids",
				"family",
			],
		},
		{ term: "カレー", expected: [] },
	])("「$term」→ $expected", ({ term, expected }) => {
		expect(findPublicTagsMatchingTerm(term)).toEqual(expected);
	});
});

describe("parseSearchTags", () => {
	it("語の一覧にないキーは捨て、重複を除き、上限までにする", () => {
		expect(
			parseSearchTags([
				"main_dish",
				"unknown",
				"main_dish",
				"quick",
				"bento",
				"spring",
				"soup",
				"salad",
			]),
		).toEqual(["main_dish", "quick", "bento", "spring", "soup"]);
	});
});
