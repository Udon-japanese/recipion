import { describe, expect, it } from "vitest";
import {
	findMissingIngredientLinks,
	linkedRecipeBatchRatio,
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

describe("findMissingIngredientLinks", () => {
	it.each([
		["リンク先が見つからない", "[[消えたレシピ]]", ["消えたレシピ"]],
		["リンク先が見つかる", "[[自家製ドレッシング]]", []],
		["リンク先を決めていない", "[[未設定]]", []],
		["文章の途中のリンク", "かける [[消えたレシピ]]", []],
		["リンクのない材料", "玉ねぎ", []],
	])("%s：%s → %j", (_, name, expected) => {
		expect(findMissingIngredientLinks([need("1", name)], views)).toEqual(
			expected,
		);
	});
});

describe("linkedRecipeRatio", () => {
	it.each([
		["量", { quantity: 0.5, unitLabel: "量" }, "4人分", 0.5],
		["倍", { quantity: 2, unitLabel: "倍" }, "4人分", 2],
		["単位なしの分数", { quantity: 1 / 3, unitLabel: null }, "4人分", 1 / 3],
		["人分÷リンク先の人数", { quantity: 2, unitLabel: "人分" }, "4人分", 0.5],
		["個÷リンク先の個数", { quantity: 6, unitLabel: "個" }, "12個", 0.5],
		[
			"最後の「分」は比べない",
			{ quantity: 3, unitLabel: "個" },
			"12個分",
			0.25,
		],
		["単位が違う", { quantity: 2, unitLabel: "人分" }, "12個", 1],
		[
			"リンク先が増減できない",
			{ quantity: 2, unitLabel: "人分" },
			"作りやすい分量",
			1,
		],
		[
			"g（リンク先の重さは分からない）",
			{ quantity: 50, unitLabel: "g" },
			"4人分",
			1,
		],
		["数量なし（1回分）", { quantity: null, unitLabel: null }, "4人分", 1],
	] as const)("%s", (_, need, targetYield, expected) => {
		expect(linkedRecipeRatio(need, targetYield)).toBeCloseTo(expected);
	});
});

describe("linkedRecipeBatchRatio", () => {
	it.each([
		{
			title: "このレシピの割合 × リンクの行の割合",
			need: { quantity: 0.5, unitLabel: "量" },
			target: { yieldText: "4人分" },
			parentRatio: 2,
			expected: 1,
		},
		{
			title: "リンクの行の増減のしかたは、このレシピの割合に掛ける",
			need: { quantity: 1, unitLabel: "量", scaleWeight: 0.5 },
			target: { yieldText: "4人分" },
			parentRatio: 2,
			expected: 1.5,
		},
		{
			title: "リンク先が「この分量で作る」なら、いつも1回分",
			need: { quantity: 0.5, unitLabel: "量" },
			target: { yieldText: "4人分", scalable: false },
			parentRatio: 3,
			expected: 1,
		},
	])("$title", ({ need, target, parentRatio, expected }) => {
		expect(linkedRecipeBatchRatio(need, target, parentRatio)).toBeCloseTo(
			expected,
		);
	});
});
