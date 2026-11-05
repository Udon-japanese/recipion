import type { IngredientDictionaryEntry } from "../domain/ingredient-dictionary";

// ユーザーの食材辞書の保存先（ユーザーで絞った実装を渡す）。
export interface IngredientDictionaryRepository {
	// 自分の食材と呼び名（作り置きのできあがりの食材は除く）。
	list(): Promise<IngredientDictionaryEntry[]>;
	// 在庫なしで、食材だけを作る（カタログにある名前は、カタログの別名もまとめて入る）。
	create(name: string): Promise<void>;
	rename(ingredientId: string, name: string): Promise<void>;
	addAlias(ingredientId: string, alias: string): Promise<void>;
	removeAlias(ingredientId: string, alias: string): Promise<void>;
	// 在庫のある食材は消せない（呼ぶ側で確かめる）。
	remove(ingredientId: string): Promise<void>;
}
