import {
	createIngredientDictionary,
	type IngredientDictionary,
	type IngredientDictionaryEntry,
} from "#/features/ingredients/domain/ingredient-dictionary";

// テスト用の辞書の食材。
export function buildDictionaryEntry(
	overrides: Partial<IngredientDictionaryEntry> & { name: string },
): IngredientDictionaryEntry {
	return {
		id: `id-${overrides.name}`,
		aliases: [],
		hasInventory: false,
		...overrides,
	};
}

// テスト用の辞書（食材の名前と、呼び名）。
export function buildDictionary(
	entries: readonly (Partial<IngredientDictionaryEntry> & { name: string })[],
): IngredientDictionary {
	return createIngredientDictionary(entries.map(buildDictionaryEntry));
}
