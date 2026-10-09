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
});
