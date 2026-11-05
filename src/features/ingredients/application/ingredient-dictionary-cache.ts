import type { IngredientDictionaryEntry } from "../domain/ingredient-dictionary";

// ログインした人の印（在庫のキャッシュと同じ形）。ゲストには辞書がない。
export type IngredientDictionaryOwnerScope = `user:${string}`;

export type IngredientDictionarySnapshot = {
	ownerScope: IngredientDictionaryOwnerScope;
	entries: IngredientDictionaryEntry[];
	cachedAt: string;
};

export interface IngredientDictionaryCache {
	find(
		ownerScope: IngredientDictionaryOwnerScope,
	): Promise<IngredientDictionarySnapshot | undefined>;
	save(
		ownerScope: IngredientDictionaryOwnerScope,
		entries: readonly IngredientDictionaryEntry[],
		now?: Date,
	): Promise<void>;
}
