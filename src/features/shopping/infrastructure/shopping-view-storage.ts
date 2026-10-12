import { storageKeys } from "#/local-storage/keys";
import { enumStorageItem } from "#/local-storage/storage-item";

export const shoppingViewModes = ["aisle", "store"] as const;

export type ShoppingViewMode = (typeof shoppingViewModes)[number];

// 買い物メモの表示：売り場順（aisle）か、店ごと（store）か。この端末に覚える。
export const shoppingViewStorage = enumStorageItem<ShoppingViewMode>({
	key: storageKeys.shoppingView,
	values: shoppingViewModes,
	defaultValue: "aisle",
});
