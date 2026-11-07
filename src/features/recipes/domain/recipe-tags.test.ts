import { describe, expect, it } from "vitest";
import {
	addPersonalRecipeTag,
	type PublicRecipeTag,
	publicRecipeTagCategories,
	publicRecipeTags,
	togglePublicRecipeTag,
	visiblePersonalTags,
} from "./recipe-tags";

describe("公開用の語の一覧", () => {
	it("キーと表示名は、どちらも重ならない", () => {
		const entries: (readonly [string, string])[] =
			publicRecipeTagCategories.flatMap(
				(category): readonly (readonly [string, string])[] => category.tags,
			);

		expect(new Set(entries.map(([tag]) => tag)).size).toBe(entries.length);
		expect(new Set(entries.map(([, label]) => label)).size).toBe(
			entries.length,
		);
		expect(publicRecipeTags).toHaveLength(entries.length);
	});
});

describe("togglePublicRecipeTag", () => {
	const five: PublicRecipeTag[] = [
		"main_dish",
		"soup",
		"quick",
		"bento",
		"spring",
	];

	it.each<{
		title: string;
		tags: PublicRecipeTag[];
		tag: PublicRecipeTag;
		expected: PublicRecipeTag[];
	}>([
		{
			title: "付けると、語の一覧の順に並ぶ",
			tags: ["quick"],
			tag: "main_dish",
			expected: ["main_dish", "quick"],
		},
		{
			title: "付いているものは外す",
			tags: ["main_dish", "quick"],
			tag: "main_dish",
			expected: ["quick"],
		},
		{
			title: "5つあると、もう付けない",
			tags: five,
			tag: "salad",
			expected: five,
		},
		{
			title: "5つあっても、外せる",
			tags: five,
			tag: "soup",
			expected: ["main_dish", "quick", "bento", "spring"],
		},
	])("$title", ({ tags, tag, expected }) => {
		expect(togglePublicRecipeTag(tags, tag)).toEqual(expected);
	});
});

describe("addPersonalRecipeTag", () => {
	const ten = Array.from({ length: 10 }, (_, index) => `タグ${index}`);

	it.each([
		{
			title: "前後の空白を除いて、最後に足す",
			tags: ["晩ご飯"],
			text: "  お弁当 ",
			expected: { status: "added", tags: ["晩ご飯", "お弁当"] },
		},
		{
			title: "空は足さない",
			tags: [],
			text: "　",
			expected: { status: "rejected", message: "タグを入れてください" },
		},
		{
			title: "同じタグは足さない",
			tags: ["晩ご飯"],
			text: "晩ご飯 ",
			expected: { status: "rejected", message: "同じタグがすでにあります" },
		},
		{
			title: "21文字は足さない",
			tags: [],
			text: "あ".repeat(21),
			expected: { status: "rejected", message: "タグは1つ20文字までです" },
		},
		{
			title: "10個あると足さない",
			tags: ten,
			text: "もう1つ",
			expected: {
				status: "rejected",
				message: "個人用のタグは10個までです",
			},
		},
	])("$title", ({ tags, text, expected }) => {
		expect(addPersonalRecipeTag(tags, text)).toEqual(expected);
	});
});

describe("visiblePersonalTags", () => {
	const owner = { userId: "owner", personalTags: ["晩ご飯"] };

	it("本人には返し、他の人には空を返す", () => {
		expect(visiblePersonalTags(owner, "owner")).toEqual(["晩ご飯"]);
		expect(visiblePersonalTags(owner, "someone-else")).toEqual([]);
	});
});
