import { describe, expect, it } from "vitest";
import { mergeRecipeNeeds } from "./merge-recipe-needs";
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
		"g と kg は、g でまとめる。同じ kg なら kg のまま",
		[
			need("a", "小麦粉", 1, "kg", "1kg"),
			need("b", "小麦粉", 200, "g", "200g"),
		],
		[["a", "小麦粉", 1200, "g", "1200g"]],
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
});
