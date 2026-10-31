import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import type { InventoryTile } from "./inventory-fridge";
import { toHiragana } from "./inventory-grouping";

function normalizeForSearch(text: string): string {
	return toHiragana(normalizeIngredientName(text));
}

// 在庫の検索：呼び名・食材名・読み仮名に加えて、カタログの別表記（「ポテト」→じゃがいも）でも当てる。
// ひらがな・カタカナの違いは、無視する（「たまねぎ」「タマネギ」→玉ねぎ）。
export function matchesInventorySearch(
	tile: InventoryTile,
	query: string,
): boolean {
	// 空の言葉は、正規化できない（例外になる）ので、先に見る。
	if (query.trim() === "") {
		return true;
	}

	const text = normalizeForSearch(query);

	const entry = findIngredientCatalogEntry(tile.ingredientName);
	const candidates = [
		tile.name,
		tile.ingredientName,
		tile.sortReading,
		...(entry?.aliases ?? []),
		...(entry?.reading ? [entry.reading] : []),
	];

	return candidates
		.filter((candidate) => candidate.trim() !== "")
		.some((candidate) => normalizeForSearch(candidate).includes(text));
}
