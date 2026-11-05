// うちの人数（設定）と、レシピを最初にどの量で見せるか。
import { normalizeYieldUnit, parseRecipeYield } from "./recipe-yield";

export const minHouseholdSize = 1;
export const maxHouseholdSize = 20;

// うちの人数を使うレシピか（できあがりの単位が「人分」で、量を変えられる）。
export function usesHouseholdSize(recipe: {
	yieldText: string;
	scalable?: boolean;
}): boolean {
	const recipeYield = parseRecipeYield(recipe.yieldText);

	return (
		recipe.scalable !== false &&
		recipeYield !== null &&
		normalizeYieldUnit(recipeYield.suffix) === "人"
	);
}

// 見せるできあがりの数（undefined は、レシピの量のまま）。
// 優先する順：URL の ?n=（リンクから開いた量・自分で変えた量）→ うちの人数（「人分」のレシピだけ）→ レシピの量。
// 「この分量で作る」レシピは、いつもレシピの量。
export function resolveWantedYield(input: {
	recipe: { yieldText: string; scalable?: boolean };
	urlWanted: number | undefined;
	householdSize: number | null;
}): number | undefined {
	const { recipe, urlWanted, householdSize } = input;

	if (recipe.scalable === false) {
		return undefined;
	}

	if (urlWanted !== undefined) {
		return urlWanted;
	}

	return householdSize !== null && usesHouseholdSize(recipe)
		? householdSize
		: undefined;
}
