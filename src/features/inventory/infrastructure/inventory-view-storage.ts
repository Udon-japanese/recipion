import { storageKeys } from "#/local-storage/keys";
import {
	defineStorageItem,
	enumStorageItem,
} from "#/local-storage/storage-item";
import {
	type InventoryGroupBy,
	inventoryGroupByOptions,
} from "../domain/inventory-grouping";

export const inventoryViews = ["list", "scene"] as const;

export type InventoryView = (typeof inventoryViews)[number];

// 在庫の表示：リストか、おうちか。この端末に覚える。
export const inventoryViewStorage = enumStorageItem<InventoryView>({
	key: storageKeys.inventoryView,
	values: inventoryViews,
	defaultValue: "list",
});

// おうちの表示で、れしぽよを出すか（初期値は、出す）。
export const inventoryPetStorage = defineStorageItem<boolean>({
	key: storageKeys.inventoryPet,
	defaultValue: true,
	parse: (raw) => (raw === "on" ? true : raw === "off" ? false : undefined),
	serialize: (visible) => (visible ? "on" : "off"),
});

// リストのまとめ方。
export const inventoryGroupByStorage = enumStorageItem<InventoryGroupBy>({
	key: storageKeys.inventoryGroupBy,
	values: inventoryGroupByOptions.map((option) => option.value),
	defaultValue: "zone",
});

// ない在庫（量が 0・「なし」）を、かくすか（初期値は、出す）。リストとおうちで共通。
export const inventoryHideEmptyStorage = defineStorageItem<boolean>({
	key: storageKeys.inventoryHideEmpty,
	defaultValue: false,
	parse: (raw) => (raw === "on" ? true : raw === "off" ? false : undefined),
	serialize: (hidden) => (hidden ? "on" : "off"),
});
