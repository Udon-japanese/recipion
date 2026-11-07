import { describe, expect, it } from "vitest";
import {
	collectOwnRecipeTags,
	filterOwnRecipes,
	type OwnRecipeTagFilter,
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
