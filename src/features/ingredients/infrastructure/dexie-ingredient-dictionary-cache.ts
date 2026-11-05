import { getLocalDatabase, type LocalDatabase } from "#/local-db/database";
import type { IngredientDictionaryCache } from "../application/ingredient-dictionary-cache";

export function createDexieIngredientDictionaryCache(
	database: LocalDatabase = getLocalDatabase(),
): IngredientDictionaryCache {
	return {
		async find(ownerScope) {
			return database.ingredientDictionaries.get(ownerScope);
		},

		async save(ownerScope, entries, now = new Date()) {
			await database.ingredientDictionaries.put({
				ownerScope,
				entries: [...entries],
				cachedAt: now.toISOString(),
			});
		},
	};
}
