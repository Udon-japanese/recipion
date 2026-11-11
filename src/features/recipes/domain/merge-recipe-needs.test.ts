import { describe, expect, it } from "vitest";
import { buildDictionary } from "#/test/builders/build-ingredient-dictionary";
import {
	describeAmount,
	describeAmountRange,
	mergeRecipeNeeds,
} from "./merge-recipe-needs";
import type { RecipeShoppingNeed } from "./plan-shopping-from-recipe";

function need(
	id: string,
	name: string,
	quantity: number | null,
	unitLabel: string | null,
	amountText: string | null = null,
	extra: Partial<RecipeShoppingNeed> = {},
): RecipeShoppingNeed {
	return { id, name, quantity, unitLabel, amountText, ...extra };
}

type Case = [
	title: string,
	needs: RecipeShoppingNeed[],
	// 期待する結果：[id, 名前, 数量, 単位, 分量の表示]
	expected: [string, string, number | null, string | null, string | null][],
];

const cases: Case[] = [
	[
		"同じ単位は合算する",
		[
			need("a", "醤油", 2, "大さじ", "大さじ2"),
			need("b", "醤油", 1, "大さじ", "大さじ1"),
		],
		[["a", "醤油", 3, "大さじ", "大さじ3"]],
	],
	[
		"「少し」「適量」は、数量のある行の補足にする",
		[
			need("a", "オリーブオイル", 1.5, "大さじ", "大さじ1と1/2"),
			need("b", "オリーブオイル", null, null, "少し"),
		],
		[["a", "オリーブオイル", 1.5, "大さじ", "大さじ1と1/2（＋少し）"]],
	],
	[
		"数量のない行だけなら、数量のない1行にする",
		[
			need("a", "胡椒", null, null, "少々"),
			need("b", "胡椒", null, null, "適量"),
		],
		[["a", "胡椒", null, null, "少々"]],
	],
	[
		"違う体積の単位は、ml でまとめる（大さじ1＋小さじ1＝20ml）",
		[
			need("a", "酢", 1, "大さじ", "大さじ1"),
			need("b", "酢", 1, "小さじ", "小さじ1"),
		],
		[["a", "酢", 20, "ml", "20ml"]],
	],
	[
		"体積と ml は、ml でまとめる",
		[
			need("a", "牛乳", 100, "ml", "100ml"),
			need("b", "牛乳", 1, "カップ", "1カップ"),
		],
		[["a", "牛乳", 300, "ml", "300ml"]],
	],
	[
		"g と kg は、g でまとめる（数量は g のまま、表示は 1.2kg）。同じ kg なら kg のまま",
		[
			need("a", "小麦粉", 1, "kg", "1kg"),
			need("b", "小麦粉", 200, "g", "200g"),
		],
		[["a", "小麦粉", 1200, "g", "1.2kg"]],
	],
	[
		"換算できない行（重さと個数）は、まとめず、別の行のまま",
		[
			need("a", "玉ねぎ", 2, "個", "2個"),
			need("b", "玉ねぎ", 100, "g", "100g"),
		],
		[
			["a", "玉ねぎ", 2, "個", "2個"],
			["b", "玉ねぎ", 100, "g", "100g"],
		],
	],
	[
		"別名は、同じ食材として扱う",
		[
			need("a", "たまねぎ", 1, "個", "1個"),
			need("b", "玉ねぎ", 2, "個", "2個"),
		],
		[["a", "たまねぎ", 3, "個", "3個"]],
	],
	[
		"違う食材は、まとめない。並び順も保つ",
		[
			need("a", "塩", null, null, "少々"),
			need("b", "砂糖", 1, "大さじ", "大さじ1"),
			need("c", "塩", 1, "小さじ", "小さじ1"),
		],
		[
			["c", "塩", 1, "小さじ", "小さじ1（＋少々）"],
			["b", "砂糖", 1, "大さじ", "大さじ1"],
		],
	],
	[
		"リンク先のレシピから展開した行は、まとまり（レシピ）が違えば、まとめない",
		[
			need("a", "醤油", 1, "大さじ", "大さじ1"),
			need("b", "醤油", 1, "大さじ", "大さじ1", { sectionTitle: "たれの材料" }),
		],
		[
			["a", "醤油", 1, "大さじ", "大さじ1"],
			["b", "醤油", 1, "大さじ", "大さじ1"],
		],
	],
];

describe("mergeRecipeNeeds", () => {
	it.each(cases)("%s", (_title, needs, expected) => {
		expect(
			mergeRecipeNeeds(needs).map((merged) => [
				merged.id,
				merged.name,
				merged.quantity,
				merged.unitLabel,
				merged.amountText,
			]),
		).toEqual(expected);
	});

	it("まとめた行には、元の分量の原文を残す。まとめていない行には付けない", () => {
		const [merged, alone] = mergeRecipeNeeds([
			need("a", "オリーブオイル", 1.5, "大さじ", "大さじ1と1/2"),
			need("b", "オリーブオイル", null, null, "少し"),
			need("c", "卵", 1, "個", "1個"),
		]);

		expect(merged?.mergedAmountTexts).toEqual(["大さじ1と1/2", "少し"]);
		expect(alone?.mergedAmountTexts).toBeUndefined();
	});

	it("他のレシピへのリンクの行は、そのまま通す", () => {
		const linked = need("l", "たれ", null, null, null, {
			linkedRecipe: { publicId: "p", name: "たれ" },
		});

		expect(mergeRecipeNeeds([linked, linked])).toEqual([linked, linked]);
	});

	it("上限にした範囲の行と、ほかの行をまとめると、範囲の情報は残さない（内訳に原文を残す）", () => {
		const [merged] = mergeRecipeNeeds([
			need("a", "豚こま肉", 70, "g", "60~70g", { range: { min: 60, max: 70 } }),
			need("b", "豚こま肉", 100, "g", "100g"),
		]);

		expect(merged).toMatchObject({
			quantity: 170,
			amountText: "170g",
			mergedAmountTexts: ["60~70g", "100g"],
		});
		expect(merged?.range).toBeUndefined();
	});
});

describe("mergeRecipeNeeds（自分の食材辞書）", () => {
	it("自分で足した呼び名の行も、同じ材料として1行にまとめる", () => {
		const dictionary = buildDictionary([
			{ name: "マイだし", aliases: ["うちのだし"] },
		]);
		const merged = mergeRecipeNeeds(
			[
				need("a", "マイだし", 100, "ml", "100ml"),
				need("b", "うちのだし", 50, "ml", "50ml"),
			],
			dictionary,
		);

		expect(
			merged.map(({ id, name, quantity }) => [id, name, quantity]),
		).toEqual([["a", "マイだし", 150]]);
	});
});

describe("describeAmount・describeAmountRange（1,000g 以上は kg、1,000ml・1,000cc 以上は L）", () => {
	it.each([
		{ quantity: 1200, unit: "g", expected: "1.2kg" },
		{ quantity: 1500, unit: "cc", expected: "1.5L" },
		{ quantity: 300, unit: "cc", expected: "300cc" },
		{ quantity: 1.5, unit: "大さじ", expected: "大さじ1と1/2" },
		{ quantity: 2, unit: null, expected: "2" },
	])("$quantity $unit → $expected", ({ quantity, unit, expected }) => {
		expect(describeAmount(quantity, unit)).toBe(expected);
	});

	it.each([
		// 片方が 1,000 未満なら、両端とも元の単位（範囲の中で単位を混ぜない）。
		{ min: 800, max: 1200, unit: "g", expected: "800~1200g" },
		{ min: 1000, max: 1500, unit: "g", expected: "1~1.5kg" },
		{ min: 1250, max: 1500, unit: "ml", expected: "1.25~1.5L" },
		{ min: 60, max: 70, unit: "g", expected: "60~70g" },
		{ min: 2, max: 3, unit: "大さじ", expected: "大さじ2~3" },
	])("$min~$max $unit → $expected", ({ min, max, unit, expected }) => {
		expect(describeAmountRange({ min, max }, unit)).toBe(expected);
	});
});
