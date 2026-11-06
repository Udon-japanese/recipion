import { describe, expect, it } from "vitest";
import {
	buildDictionary,
	buildDictionaryEntry,
} from "#/test/builders/build-ingredient-dictionary";
import {
	findAliasProblem,
	findIngredientNameProblem,
	ingredientDictionaryLimits,
	isUnmanagedIngredient,
	listUserAliases,
	toCanonicalIngredientName,
} from "./ingredient-dictionary";

const myDashi = buildDictionaryEntry({
	name: "マイだし",
	aliases: ["うちのだし"],
});
// カタログの卵（在庫の登録で、カタログの別名も入っている）に、自分で「タマ」を足した。
const egg = buildDictionaryEntry({
	name: "卵",
	aliases: ["たまご", "玉子", "タマ"],
	hasInventory: true,
});
const dictionary = buildDictionary([myDashi, egg]);

describe("toCanonicalIngredientName", () => {
	it.each([
		{ title: "呼び名 → 代表の名前", name: "うちのだし", expected: "マイだし" },
		{ title: "全角・半角の違いをなくす", name: "ﾀﾏ", expected: "卵" },
		{ title: "代表の名前は、そのまま", name: "マイだし", expected: "マイだし" },
		{ title: "辞書にない名前は、そのまま", name: "牛乳", expected: "牛乳" },
	])("$title", ({ name, expected }) => {
		expect(toCanonicalIngredientName(name, dictionary)).toBe(expected);
	});

	it("辞書がなければ、そのまま（ゲスト）", () => {
		expect(toCanonicalIngredientName("うちのだし", undefined)).toBe(
			"うちのだし",
		);
	});
});

describe("listUserAliases", () => {
	it("カタログの別名は除き、自分で足した呼び名だけを返す", () => {
		expect(listUserAliases(egg)).toEqual(["タマ"]);
		expect(listUserAliases(myDashi)).toEqual(["うちのだし"]);
	});
});

describe("findIngredientNameProblem / findAliasProblem", () => {
	it.each([
		{ title: "空", name: "  ", target: undefined, kind: "empty" },
		{
			title: "長すぎる",
			name: "あ".repeat(51),
			target: undefined,
			kind: "too-long",
		},
		{
			title: "ほかの食材の呼び名",
			name: "うちのだし",
			target: egg,
			kind: "taken",
		},
		{ title: "ほかの食材の名前", name: "卵", target: myDashi, kind: "taken" },
		{
			title: "別のカタログの食材の別名",
			name: "しょうゆ",
			target: myDashi,
			kind: "catalog",
		},
		{
			title: "新しく作るカタログの名前は、問題ない",
			name: "牛乳",
			target: undefined,
			kind: null,
		},
		{
			title: "カタログにない新しい名前",
			name: "自家製ラー油",
			target: undefined,
			kind: null,
		},
	])("$title", ({ name, target, kind }) => {
		expect(
			findIngredientNameProblem(dictionary, name, target)?.kind ?? null,
		).toBe(kind);
	});

	it("名前を変えるときは、自分の呼び名を名前にしてよい", () => {
		expect(
			findIngredientNameProblem(dictionary, "うちのだし", myDashi, {
				allowOwnName: true,
			}),
		).toBeNull();
	});

	it("呼び名は、1つの食材に上限まで", () => {
		const full = buildDictionaryEntry({
			name: "マイソース",
			aliases: Array.from(
				{ length: ingredientDictionaryLimits.maxUserAliases },
				(_, index) => `ソース${index}号`,
			),
		});

		expect(
			findAliasProblem(buildDictionary([full]), full, "新しい呼び名")?.kind,
		).toBe("too-many");
	});
});

describe("isUnmanaged", () => {
	it("管理しない材料は、名前でも呼び名でも当たり、ほかの材料・辞書なしは当たらない", () => {
		const water = buildDictionary([
			{ name: "水", aliases: ["お水"], unmanaged: true },
			{ name: "マイだし" },
		]);

		expect(water.isUnmanaged("水")).toBe(true);
		expect(water.isUnmanaged("お水")).toBe(true);
		expect(water.isUnmanaged("マイだし")).toBe(false);
		expect(water.isUnmanaged("牛乳")).toBe(false);
		expect(isUnmanagedIngredient("水", undefined)).toBe(false);
	});
});
