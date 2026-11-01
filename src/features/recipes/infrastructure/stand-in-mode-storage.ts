import { storageKeys } from "#/local-storage/keys";
import { enumStorageItem } from "#/local-storage/storage-item";
import { type StandInMode, standInModes } from "../domain/find-stand-ins";

// 冷凍野菜を、生の野菜の代わりに使うかの設定（この端末だけに保存する）。初期値は、形が自由なものだけ自動で使う。
export const standInModeItem = enumStorageItem<StandInMode>({
	key: storageKeys.standInMode,
	values: standInModes,
	defaultValue: "auto",
});
