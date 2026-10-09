import { describe, expect, it, vi } from "vitest";
import { loadLinkedRecipeTree } from "./load-linked-recipe-tree";
import type { RecipeDetail } from "./recipe-repository";

function recipe(publicId: string, linkedIds: string[]): RecipeDetail {
	return {
		publicId,
		name: publicId,
		ingredients: linkedIds.map((id) => ({
			type: "ingredient",
			id: `${publicId}-${id}`,
			status: "missing-amount",
			rawText: `[[${id}]]`,
			name: `[[${id}]]`,
			amountText: null,
			quantity: null,
			unitLabel: null,
		})),
		linkViews: linkedIds.map((id) => ({
			label: id,
			target: { publicId: id, name: id },
		})),
	} as unknown as RecipeDetail;
}

describe("loadLinkedRecipeTree", () => {
	it("リンク先の中のリンクを、3段までたどり、同じレシピは1度だけ取る（輪でも止まる）", async () => {
		const recipes: Record<string, RecipeDetail> = {
			a: recipe("a", ["b"]),
			b: recipe("b", ["c", "a"]),
			c: recipe("c", ["d"]),
			d: recipe("d", ["e"]),
			e: recipe("e", []),
		};
		const load = vi.fn(async (id: string) => recipes[id] ?? null);

		const result = await loadLinkedRecipeTree(["a"], load);

		// a（1段目）→ b（2段目）→ c（3段目）まで。d は4段目なので、取らない
		expect(Object.keys(result).sort()).toEqual(["a", "b", "c"]);
		expect(load).toHaveBeenCalledTimes(3);
	});

	it("見つからないレシピは、含めない", async () => {
		const result = await loadLinkedRecipeTree(["x"], async () => null);

		expect(result).toEqual({});
	});
});
