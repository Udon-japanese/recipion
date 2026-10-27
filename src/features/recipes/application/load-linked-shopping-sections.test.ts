import { describe, expect, it, vi } from "vitest";
import type { RecipeShoppingNeed } from "../domain/plan-shopping-from-recipe";
import { loadLinkedShoppingSections } from "./load-linked-shopping-sections";
import type { RecipeDetail } from "./recipe-repository";

function item(id: string, name: string) {
	return {
		type: "ingredient",
		id,
		status: "missing-amount",
		rawText: name,
		name,
		amountText: null,
		quantity: null,
		unitLabel: null,
	};
}

function recipe(
	name: string,
	names: string[],
	linkViews: RecipeDetail["linkViews"] = [],
): RecipeDetail {
	return {
		name,
		servings: 2,
		ingredients: names.map((n, index) => item(`${name}-${index}`, n)),
		linkViews,
	} as unknown as RecipeDetail;
}

const linkNeed = (publicId: string, name: string): RecipeShoppingNeed => ({
	id: `link-${publicId}`,
	name,
	quantity: null,
	unitLabel: null,
	amountText: null,
	linkedRecipe: { publicId, name },
});

describe("loadLinkedShoppingSections", () => {
	it("リンク先の材料を、リンク先ごとのまとまりにして、リンク先の中のリンクもたどる。輪になっていても止まる", async () => {
		const recipes: Record<string, RecipeDetail> = {
			a: recipe(
				"A",
				["醤油", "[[B]]"],
				[{ label: "B", target: { publicId: "b", name: "B" } }],
			),
			b: recipe(
				"B",
				["酢", "[[A]]"],
				[{ label: "A", target: { publicId: "a", name: "A" } }],
			),
		};
		const load = vi.fn(async (publicId: string) => recipes[publicId] ?? null);

		const { sections, failedNames } = await loadLinkedShoppingSections(
			[linkNeed("a", "A")],
			load,
		);

		expect(sections.map((s) => [s.title, s.needs.map((n) => n.name)])).toEqual([
			["Aの材料", ["醤油"]],
			["Bの材料", ["酢"]],
		]);
		expect(sections[0]?.needs[0]?.id).toBe("a/A-0");
		expect(failedNames).toEqual([]);
		expect(load).toHaveBeenCalledTimes(2);
	});

	it("見つからないレシピは含めず、読み込めなかったレシピの名前を返す", async () => {
		const load = vi.fn(async (publicId: string) => {
			if (publicId === "x") {
				throw new Error("network");
			}

			return null;
		});

		const result = await loadLinkedShoppingSections(
			[linkNeed("x", "X"), linkNeed("y", "Y")],
			load,
		);

		expect(result.sections).toEqual([]);
		expect(result.failedNames).toEqual(["X"]);
	});

	it("リンクの行の割合を、材料の分量に掛ける。入れ子のときは掛け合わせる", async () => {
		const measured = (
			id: string,
			name: string,
			quantity: number,
			unit: string,
		) => ({
			...item(id, name),
			status: "parsed",
			amountText: `${quantity}${unit}`,
			quantity,
			unitLabel: unit,
		});
		const recipes: Record<string, RecipeDetail> = {
			a: {
				name: "A",
				servings: 4,
				ingredients: [
					measured("a-0", "醤油", 100, "ml"),
					{
						...item("a-1", "[[B]]"),
						status: "parsed",
						quantity: 0.5,
						unitLabel: "量",
						amountText: "半分",
					},
				],
				linkViews: [{ label: "B", target: { publicId: "b", name: "B" } }],
			} as unknown as RecipeDetail,
			b: {
				name: "B",
				servings: 2,
				ingredients: [measured("b-0", "酢", 40, "ml")],
				linkViews: [],
			} as unknown as RecipeDetail,
		};
		const load = async (publicId: string) => recipes[publicId] ?? null;
		const halfOfA: RecipeShoppingNeed = {
			...linkNeed("a", "A"),
			quantity: 2,
			unitLabel: "人分",
		};

		const { sections } = await loadLinkedShoppingSections([halfOfA], load);

		// A は 2人分÷4人＝0.5、B は 0.5×0.5＝0.25
		expect(
			sections.map((s) => [s.title, s.needs.map((n) => [n.name, n.quantity])]),
		).toEqual([
			["Aの材料", [["醤油", 50]]],
			["Bの材料", [["酢", 10]]],
		]);
	});

	it("同じレシピに2回リンクしたときは、割合を足して、1つのまとまりにする", async () => {
		const a = {
			name: "A",
			servings: 2,
			ingredients: [
				{
					...item("a-0", "醤油"),
					status: "parsed",
					quantity: 10,
					unitLabel: "ml",
					amountText: "10ml",
				},
			],
			linkViews: [],
		} as unknown as RecipeDetail;
		const half = (id: string): RecipeShoppingNeed => ({
			...linkNeed("a", "A"),
			id,
			quantity: 0.5,
			unitLabel: "量",
		});

		const { sections } = await loadLinkedShoppingSections(
			[half("1"), half("2")],
			async () => a,
		);

		expect(sections).toHaveLength(1);
		expect(sections[0]?.needs[0]?.quantity).toBe(10);
	});
});
