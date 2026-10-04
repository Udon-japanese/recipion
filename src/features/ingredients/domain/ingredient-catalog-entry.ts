import type { IngredientCatalogEntry } from "./ingredient-catalog";

type CatalogEntryInput = Omit<IngredientCatalogEntry, "defaultTrackingMode"> &
	Partial<Pick<IngredientCatalogEntry, "defaultTrackingMode">>;

// 管理方法の初期値は、特に指定がなければ「だいたいで管理」。
export function entry(input: CatalogEntryInput): IngredientCatalogEntry {
	return { defaultTrackingMode: "estimated", ...input };
}

// 種類ごとのファイルで、カテゴリの初期値を付ける。個別に categoryId を持つ食材は、そちらを優先する。
export function withDefaultCategory(
	categoryId: NonNullable<IngredientCatalogEntry["categoryId"]>,
	entries: readonly IngredientCatalogEntry[],
): readonly IngredientCatalogEntry[] {
	return entries.map((item) => ({ categoryId, ...item }));
}
