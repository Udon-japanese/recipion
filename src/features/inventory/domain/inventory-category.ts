import { inferItemCategory } from "#/features/item-category/domain/infer-item-category";
import type { ItemCategoryId } from "#/features/item-category/domain/item-category";

// 在庫の項目のカテゴリ。保存したものがなければ、名前から推定する（推定は保存しない）。
export function resolveInventoryItemCategory(item: {
	name: string;
	// 古い控え（カテゴリより前のキャッシュ）には、ない。
	categoryId?: ItemCategoryId | null;
}): ItemCategoryId | null {
	return item.categoryId ?? inferItemCategory(item.name);
}
