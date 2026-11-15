import { describe, expect, it } from "vitest";
import {
	collectOwnRecipeTags,
	filterOwnRecipes,
	maxOwnRecipeTagFilters,
	type OwnRecipeTagFilter,
	parseOwnRecipeTagFilters,
} from "./filter-own-recipes";
import type { PublicRecipeTag } from "./recipe-tags";

type Recipe = {
	name: string;
	publicTags: PublicRecipeTag[];
	personalTags: string[];
};

const ginger: Recipe = {
	name: "豚の生姜焼き",
	publicTags: ["main_dish", "quick"],
	personalTags: ["晩ご飯"],
};
const hamburg: Recipe = {
	name: "ハンバーグ",
	publicTags: ["main_dish"],
	personalTags: ["晩ご飯", "子どもが好き"],
};
const chicken: Recipe = {
	name: "ＫＦＣ風チキン",
	publicTags: [],
	personalTags: ["ランチ"],
};
const recipes = [ginger, hamburg, chicken];

describe("filterOwnRecipes", () => {
	it.each<{
		title: string;
		query: string;
		tags?: OwnRecipeTagFilter[];
		expected: Recipe[];
	}>([
		{
			title: "空の検索は、すべてをそのままの順で",
			query: "  ",
			expected: recipes,
		},
		{ title: "ひらがなとカタカナ", query: "はんばーぐ", expected: [hamburg] },
		{ title: "全角と半角、大文字と小文字", query: "kfc", expected: [chicken] },
		{ title: "語はすべてを含むもの", query: "豚 焼き", expected: [ginger] },
		{ title: "どれにも当たらない語", query: "豚 チキン", expected: [] },
		{
			title: "公開用のタグの表示名に当たる",
			query: "時短",
			expected: [ginger],
		},
		{ title: "個人用のタグに当たる", query: "らんち", expected: [chicken] },
		{
			title: "名前とタグにまたがる語",
			query: "ハンバーグ 晩ご飯",
			expected: [hamburg],
		},
		{
			title: "選んだタグをすべて持つもの",
			query: "",
			tags: [
				{ kind: "public", tag: "main_dish" },
				{ kind: "personal", tag: "晩ご飯" },
			],
			expected: [ginger, hamburg],
		},
		{
			title: "タグと検索語の両方",
			query: "豚",
			tags: [{ kind: "personal", tag: "晩ご飯" }],
			expected: [ginger],
		},
		{
			title: "公開用と個人用は、同じ文字でも別のタグ",
			query: "",
			tags: [{ kind: "personal", tag: "main_dish" }],
			expected: [],
		},
	])("$title", ({ query, tags, expected }) => {
		expect(filterOwnRecipes(recipes, query, tags)).toEqual(expected);
	});
});

describe("collectOwnRecipeTags", () => {
	it("公開用は語の一覧の順、個人用は多い順で、重複なし", () => {
		expect(collectOwnRecipeTags(recipes)).toEqual({
			publicTags: ["main_dish", "quick"],
			personalTags: ["晩ご飯", "ランチ", "子どもが好き"],
		});
	});
});

describe("parseOwnRecipeTagFilters", () => {
	it.each<{
		title: string;
		values: { kind: "public" | "personal"; tag: string }[];
		expected: OwnRecipeTagFilter[];
	}>([
		{
			title: "公開用と個人用を、そのままの順で残す",
			values: [
				{ kind: "personal", tag: "晩ご飯" },
				{ kind: "public", tag: "main_dish" },
			],
			expected: [
				{ kind: "personal", tag: "晩ご飯" },
				{ kind: "public", tag: "main_dish" },
			],
		},
		{
			title: "語の一覧にない公開用のタグは、捨てる",
			values: [{ kind: "public", tag: "no_such_tag" }],
			expected: [],
		},
		{
			title:
				"保存できない形の個人用のタグ（空・前後の空白・長すぎる）は、捨てる",
			values: [
				{ kind: "personal", tag: "" },
				{ kind: "personal", tag: " 晩ご飯" },
				{ kind: "personal", tag: "あ".repeat(21) },
				{ kind: "personal", tag: "あ".repeat(20) },
			],
			expected: [{ kind: "personal", tag: "あ".repeat(20) }],
		},
		{
			title: "重なりは、1つにする（公開用と個人用は、同じ文字でも別）",
			values: [
				{ kind: "public", tag: "main_dish" },
				{ kind: "public", tag: "main_dish" },
				{ kind: "personal", tag: "main_dish" },
			],
			expected: [
				{ kind: "public", tag: "main_dish" },
				{ kind: "personal", tag: "main_dish" },
			],
		},
	])("$title", ({ values, expected }) => {
		expect(parseOwnRecipeTagFilters(values)).toEqual(expected);
	});

	it("上限を超えた分は、捨てる", () => {
		const values = Array.from(
			{ length: maxOwnRecipeTagFilters + 1 },
			(_, index) => ({ kind: "personal" as const, tag: `タグ${index}` }),
		);

		expect(parseOwnRecipeTagFilters(values)).toHaveLength(
			maxOwnRecipeTagFilters,
		);
	});
});
