import { describe, expect, it } from "vitest";
import {
	linkedRecipeRatio,
	resolveIngredientLinks,
} from "./link-ingredient-needs";
import type { RecipeShoppingNeed } from "./plan-shopping-from-recipe";

function need(id: string, name: string): RecipeShoppingNeed {
	return { id, name, quantity: null, unitLabel: null, amountText: "大さじ2" };
}

const views = [
	{
		label: "自家製ドレッシング",
		target: { publicId: "d", name: "和風ドレッシング" },
	},
	{ label: "消えたレシピ", target: null },
];

describe("resolveIngredientLinks", () => {
	it("名前がリンクだけで、リンク先が見つかる材料は、リンク先の現在の名前と、リンク先のレシピを付ける", () => {
		const [result] = resolveIngredientLinks(
			[need("1", "[[自家製ドレッシング]]")],
			views,
		);

		expect(result).toMatchObject({
			id: "1",
			name: "和風ドレッシング",
			linkedRecipe: { publicId: "d", name: "和風ドレッシング" },
		});
	});

	it("リンク先が見つからない（削除された・見られない）材料は、買い物の候補にしない", () => {
		expect(
			resolveIngredientLinks([need("1", "[[消えたレシピ]]")], views),
		).toEqual([]);
	});

	it("リンク先を決めていないラベルは、ふつうの材料（ラベルを名前にする）", () => {
		const [result] = resolveIngredientLinks([need("1", "[[未設定]]")], views);

		expect(result?.name).toBe("未設定");
		expect(result?.linkedRecipe).toBeUndefined();
	});

	it("リンクのない材料は、そのまま（同じオブジェクト）", () => {
		const plain = need("1", "玉ねぎ");

		expect(resolveIngredientLinks([plain], views)[0]).toBe(plain);
	});

	it("名前の中の、文章とリンクは、組み合わせて、ふつうの材料にする", () => {
		const [result] = resolveIngredientLinks(
			[need("1", "かける [[自家製ドレッシング]]")],
			views,
		);

		expect(result?.name).toBe("かける 和風ドレッシング");
		expect(result?.linkedRecipe).toBeUndefined();
	});
});

describe("linkedRecipeRatio", () => {
	it("量・倍・単位なしは、その数。人分は、人数÷リンク先の人数。それ以外は1回分", () => {
		expect(linkedRecipeRatio({ quantity: 0.5, unitLabel: "量" }, 4)).toBe(0.5);
		expect(linkedRecipeRatio({ quantity: 2, unitLabel: "倍" }, 4)).toBe(2);
		expect(
			linkedRecipeRatio({ quantity: 1 / 3, unitLabel: null }, 4),
		).toBeCloseTo(1 / 3);
		expect(linkedRecipeRatio({ quantity: 2, unitLabel: "人分" }, 4)).toBe(0.5);
		expect(linkedRecipeRatio({ quantity: 50, unitLabel: "g" }, 4)).toBe(1);
		expect(linkedRecipeRatio({ quantity: null, unitLabel: null }, 4)).toBe(1);
		expect(linkedRecipeRatio({ quantity: 2, unitLabel: "人分" }, 0)).toBe(1);
	});
});
