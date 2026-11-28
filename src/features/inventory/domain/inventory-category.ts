import { inferItemCategory } from "#/features/item-category/domain/infer-item-category";
import type { ItemCategoryId } from "#/features/item-category/domain/item-category";
import type { InventoryStorage } from "./inventory-lot";

// 在庫の項目のカテゴリ。保存したものがなければ、名前から推定する（推定は保存しない）。
export function resolveInventoryItemCategory(item: {
	name: string;
	// 古い控え（カテゴリより前のキャッシュ）には、ない。
	categoryId?: ItemCategoryId | null;
}): ItemCategoryId | null {
	return item.categoryId ?? inferItemCategory(item.name);
}

// カテゴリから決まる保存方法（冷凍食品・アイスは冷凍）。決まらなければ null。
// 冷凍のパプリカのように、カタログの保存方法（冷蔵）と違うものを、カテゴリで見分ける。
export function storageForCategory(
	categoryId: ItemCategoryId | null,
): InventoryStorage | null {
	return categoryId === "frozen" ? "freezer" : null;
}
