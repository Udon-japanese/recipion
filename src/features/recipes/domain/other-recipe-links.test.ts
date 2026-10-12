import { describe, expect, it } from "vitest";
import {
	filterLinkableUsers,
	filterOtherRecipes,
	getOpenLinkTyped,
	makeOtherRecipeLabelBase,
	type OtherRecipeTarget,
	parseOtherLinkQuery,
} from "./other-recipe-links";

describe("parseOtherLinkQuery", () => {
	it("@ で始まらなければ null。@ だけならユーザー検索、/ のあとはレシピ選び", () => {
		expect(parseOtherLinkQuery("カレー")).toBeNull();
		expect(parseOtherLinkQuery("")).toBeNull();
		expect(parseOtherLinkQuery("@")).toEqual({ stage: "users", query: "" });
		expect(parseOtherLinkQuery("@ta")).toEqual({ stage: "users", query: "ta" });
		expect(parseOtherLinkQuery("@taro/")).toEqual({
			stage: "recipes",
			handle: "taro",
			query: "",
		});
		// 全角の ＠ ／ も、同じに扱う。
		expect(parseOtherLinkQuery("＠ta")).toEqual({
			stage: "users",
			query: "ta",
		});
		expect(parseOtherLinkQuery("＠taro／カレ")).toEqual({
			stage: "recipes",
			handle: "taro",
			query: "カレ",
		});
		expect(parseOtherLinkQuery("@taro/カレ")).toEqual({
			stage: "recipes",
			handle: "taro",
			query: "カレ",
		});
	});
});

describe("getOpenLinkTyped", () => {
	it("閉じていない [[ の中だけ、打った文字を返す（後ろの ]] の手前も含める）", () => {
		expect(getOpenLinkTyped("煮る [[@ta", 8)).toBe("@ta");
		expect(getOpenLinkTyped("煮る [[@ta]]", 8)).toBe("@ta");
		expect(getOpenLinkTyped("煮る [[ab]] あと", 11)).toBeNull();
		expect(getOpenLinkTyped("煮る", 2)).toBeNull();
		expect(getOpenLinkTyped("前\n[[x", 6)).toBe("x");
	});
});

describe("makeOtherRecipeLabelBase", () => {
	it("「表示名の料理名」。括弧は除き、長ければ切る", () => {
		expect(makeOtherRecipeLabelBase("れしぴょなー", "カレー")).toBe(
			"れしぴょなーのカレー",
		);
		expect(makeOtherRecipeLabelBase("a[b]", "c")).toBe("a b のc");
		expect([
			...makeOtherRecipeLabelBase("あ".repeat(60), "い".repeat(60)),
		]).toHaveLength(100);
	});
});

const recipes: OtherRecipeTarget[] = [
	{
		publicId: "1",
		name: "カレー",
		createdAt: "2026-10-01T00:00:00Z",
		authorName: "A",
		authorHandle: "taro",
	},
	{
		publicId: "2",
		name: "ビーフカレー",
		createdAt: "2026-10-02T00:00:00Z",
		authorName: "A",
		authorHandle: "taro",
	},
	{
		publicId: "3",
		name: "カレー",
		createdAt: "2026-10-03T00:00:00Z",
		authorName: "B",
		authorHandle: "jiro",
	},
];

describe("filterLinkableUsers / filterOtherRecipes", () => {
	it("ユーザーは、ハンドルか表示名の前方一致（かなの違いは無視）", () => {
		const users = [
			{ handle: "taro", name: "たろう" },
			{ handle: "jiro", name: "ジロー" },
		];

		expect(filterLinkableUsers(users, "ta", 10).map((u) => u.handle)).toEqual([
			"taro",
		]);
		expect(filterLinkableUsers(users, "じろ", 10).map((u) => u.handle)).toEqual(
			["jiro"],
		);
		expect(filterLinkableUsers(users, "", 1)).toHaveLength(1);
		expect(filterLinkableUsers(users, "zz", 10)).toEqual([]);
	});

	it("レシピは、そのユーザーのものだけを、前方一致を先に並べる", () => {
		expect(
			filterOtherRecipes(recipes, "taro", "", 10).map((r) => r.publicId),
		).toEqual(["1", "2"]);
		expect(
			filterOtherRecipes(recipes, "taro", "かれ", 10).map((r) => r.publicId),
		).toEqual(["1", "2"]);
		expect(filterOtherRecipes(recipes, "jiro", "ビーフ", 10)).toEqual([]);
	});
});
