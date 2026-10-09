import { resolveIngredientLinks } from "../domain/link-ingredient-needs";
import {
	flattenRecipeIngredients,
	type RecipeShoppingNeed,
} from "../domain/plan-shopping-from-recipe";
import type { RecipeDetail } from "./recipe-repository";

export type LinkedShoppingSection = {
	publicId: string;
	// 例：「和風ドレッシングの材料」
	title: string;
	needs: RecipeShoppingNeed[];
};

export type LinkedShoppingSections = {
	sections: LinkedShoppingSection[];
	// 読み込めなかった、リンク先のレシピの名前。
	failedNames: string[];
};

// リンクをたどる深さの上限（リンクが輪になっていても、止まるように、同じレシピは1度だけ展開する）。
const maxDepth = 3;

/**
 * 材料が、他のレシピへのリンクのとき、そのレシピの材料を取ってきて、まとまり（リンク先の名前ごと）にする。
 * リンク先の中にあるリンクも、たどる。リンク先が見つからないレシピは、含めない。
 */
export async function loadLinkedShoppingSections(
	needs: readonly RecipeShoppingNeed[],
	loadRecipe: (publicId: string) => Promise<RecipeDetail | null>,
): Promise<LinkedShoppingSections> {
	const sections: LinkedShoppingSection[] = [];
	const failedNames: string[] = [];
	const visited = new Set<string>();

	async function expand(
		linkedNeeds: readonly RecipeShoppingNeed[],
		depth: number,
	) {
		for (const need of linkedNeeds) {
			const target = need.linkedRecipe;

			if (!target || visited.has(target.publicId) || depth > maxDepth) {
				continue;
			}

			visited.add(target.publicId);

			let recipe: RecipeDetail | null;

			try {
				recipe = await loadRecipe(target.publicId);
			} catch {
				failedNames.push(target.name);
				continue;
			}

			if (!recipe) {
				continue;
			}

			const resolved = resolveIngredientLinks(
				flattenRecipeIngredients(recipe.ingredients),
				recipe.linkViews,
			);

			sections.push({
				publicId: target.publicId,
				title: `${recipe.name}の材料`,
				needs: resolved
					.filter((item) => !item.linkedRecipe)
					.map((item) => ({
						...item,
						id: `${target.publicId}/${item.id}`,
						sectionTitle: `${recipe.name}の材料`,
					})),
			});

			await expand(
				resolved.filter((item) => item.linkedRecipe),
				depth + 1,
			);
		}
	}

	await expand(
		needs.filter((need) => need.linkedRecipe),
		1,
	);

	return { sections, failedNames };
}
