import { describe, expect, it } from "vitest";
import {
	emptyOwnRecipeSearch,
	type OwnRecipeSearch,
	type PublicRecipeSearch,
	readOwnRecipeSearch,
	readPublicRecipeSearch,
} from "./recipe-search-history";

describe("readOwnRecipeSearch", () => {
	it.each<{
		title: string;
		stored: unknown;
		userId: string | null;
		expected: OwnRecipeSearch;
	}>([
		{
			title: "いまの人の条件は、そのまま読む",
			stored: {
				userId: "user-a",
				query: "トマト",
				tagFilters: [{ kind: "personal", tag: "晩ご飯" }],
			},
			userId: "user-a",
			expected: {
				query: "トマト",
				tagFilters: [{ kind: "personal", tag: "晩ご飯" }],
			},
		},
		{
			title: "別の人の条件は、読まない",
			stored: { userId: "user-a", query: "トマト", tagFilters: [] },
			userId: "user-b",
			expected: emptyOwnRecipeSearch,
		},
		{
			title: "ログインしていなければ、読まない",
			stored: { userId: "user-a", query: "トマト", tagFilters: [] },
			userId: null,
			expected: emptyOwnRecipeSearch,
		},
		{
			title: "履歴に条件がなければ、条件なし",
			stored: undefined,
			userId: "user-a",
			expected: emptyOwnRecipeSearch,
		},
		{
			title: "形が違えば、条件なし",
			stored: { userId: "user-a", query: 1, tagFilters: "晩ご飯" },
			userId: "user-a",
			expected: emptyOwnRecipeSearch,
		},
		{
			title: "タグは、整えてから使う（語の一覧にない公開用のタグは捨てる）",
			stored: {
				userId: "user-a",
				query: "",
				tagFilters: [
					{ kind: "public", tag: "no_such_tag" },
					{ kind: "public", tag: "main_dish" },
				],
			},
			userId: "user-a",
			expected: {
				query: "",
				tagFilters: [{ kind: "public", tag: "main_dish" }],
			},
		},
	])("$title", ({ stored, userId, expected }) => {
		expect(readOwnRecipeSearch(stored, userId)).toEqual(expected);
	});
});

describe("readPublicRecipeSearch", () => {
	it.each<{
		title: string;
		stored: unknown;
		userId: string | null;
		expected: PublicRecipeSearch | null;
	}>([
		{
			title: "いまの人の条件は、そのまま読む",
			stored: { userId: "user-a", query: "卵", tags: ["main_dish"] },
			userId: "user-a",
			expected: { query: "卵", tags: ["main_dish"] },
		},
		{
			title: "別の人の条件は、読まない",
			stored: { userId: "user-a", query: "卵", tags: [] },
			userId: "user-b",
			expected: null,
		},
		{
			title: "履歴に条件がなければ、null",
			stored: undefined,
			userId: "user-a",
			expected: null,
		},
		{
			title: "語の一覧にない公開用のタグは、捨てる",
			stored: { userId: "user-a", query: "", tags: ["no_such_tag", "quick"] },
			userId: "user-a",
			expected: { query: "", tags: ["quick"] },
		},
	])("$title", ({ stored, userId, expected }) => {
		expect(readPublicRecipeSearch(stored, userId)).toEqual(expected);
	});
});
