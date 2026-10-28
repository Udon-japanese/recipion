import { storageKeys } from "#/local-storage/keys";
import { defineStorageItem } from "#/local-storage/storage-item";

// レシピを見ているあいだ、画面を消灯させないか（初期値は、させない＝つけたまま）。この端末に保存する。
export const recipeKeepAwakeItem = defineStorageItem<boolean>({
	key: storageKeys.recipeKeepAwake,
	defaultValue: true,
	parse: (raw) => (raw === "on" ? true : raw === "off" ? false : undefined),
	serialize: (enabled) => (enabled ? "on" : "off"),
});
