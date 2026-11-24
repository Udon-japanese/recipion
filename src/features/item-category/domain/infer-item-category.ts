import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import { householdItemNames } from "./household-item-names";
import type { ItemCategoryId } from "./item-category";

const normalizedHouseholdNames = new Set(
	householdItemNames.map((name) => normalizeIngredientName(name)),
);

// 名前からカテゴリを推定する。食材はカタログ、日用品は名前の一覧（どちらも完全一致）。
export function inferItemCategory(name: string): ItemCategoryId | null {
	if (name.trim().length === 0) {
		return null;
	}

	const catalogCategoryId = findIngredientCatalogEntry(name)?.categoryId;

	if (catalogCategoryId) {
		return catalogCategoryId;
	}

	return normalizedHouseholdNames.has(normalizeIngredientName(name))
		? "household"
		: null;
}
