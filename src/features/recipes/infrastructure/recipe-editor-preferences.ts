import { storageKeys } from "#/local-storage/keys";
import { defineStorageItem } from "#/local-storage/storage-item";

// 新規登録で、見出しを最初から入れるか（初期値は、入れる）。この端末に保存する。使えない環境では、保存しない。
export const recipeEditorTemplateItem = defineStorageItem<boolean>({
	key: storageKeys.recipeEditorTemplate,
	defaultValue: true,
	parse: (raw) => (raw === "on" ? true : raw === "off" ? false : undefined),
	serialize: (enabled) => (enabled ? "on" : "off"),
});

export function readTemplatePreference(): boolean {
	return recipeEditorTemplateItem.read();
}

export function writeTemplatePreference(enabled: boolean): void {
	recipeEditorTemplateItem.write(enabled);
}
