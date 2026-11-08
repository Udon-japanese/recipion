import { storageKeys } from "#/local-storage/keys";
import { defineStorageItem } from "#/local-storage/storage-item";

// ホームの「アプリとして使う」の案内を閉じたか（この端末に保存する）。
export const installCardDismissedItem = defineStorageItem<boolean>({
	key: storageKeys.installCardDismissed,
	defaultValue: false,
	parse: (raw) => (raw === "dismissed" ? true : undefined),
	serialize: (dismissed) => (dismissed ? "dismissed" : "shown"),
});
