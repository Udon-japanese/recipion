import { collectIngredientLinkTargetIds } from "../domain/ingredient-link-target";
import type { RecipeDetail } from "./recipe-repository";

// リンクをたどる深さ（最初のリンク先が1段目）と、取るレシピの数の上限。
export const maxLinkedRecipeDepth = 3;
const maxLinkedRecipes = 30;

/**
 * 材料のリンク先のレシピを、リンク先の中のリンクもたどって、まとめて取る（公開 ID → レシピ）。
 * 同じレシピは1度だけ取る（輪になっていても止まる）。見つからないレシピは、含めない。
 */
export async function loadLinkedRecipeTree(
	rootPublicIds: readonly string[],
	loadRecipe: (publicId: string) => Promise<RecipeDetail | null>,
): Promise<Record<string, RecipeDetail>> {
	const recipes: Record<string, RecipeDetail> = {};
	const seen = new Set<string>();
	let level = [...new Set(rootPublicIds)];

	for (
		let depth = 1;
		depth <= maxLinkedRecipeDepth && level.length > 0;
		depth += 1
	) {
		const targets = level
			.filter((publicId) => !seen.has(publicId))
			.slice(0, Math.max(0, maxLinkedRecipes - seen.size));

		for (const publicId of targets) {
			seen.add(publicId);
		}

		const loaded = await Promise.all(
			targets.map((publicId) => loadRecipe(publicId)),
		);
		const next: string[] = [];

		for (const [index, recipe] of loaded.entries()) {
			const publicId = targets[index];

			if (!recipe || publicId === undefined) {
				continue;
			}

			recipes[publicId] = recipe;
			next.push(
				...collectIngredientLinkTargetIds(recipe.ingredients, recipe.linkViews),
			);
		}

		level = [...new Set(next)];
	}

	return recipes;
}
