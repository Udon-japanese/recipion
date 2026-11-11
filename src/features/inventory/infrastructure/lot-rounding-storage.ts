import { storageKeys } from "#/local-storage/keys";
import { enumStorageItem } from "#/local-storage/storage-item";
import { type LotRounding, lotRoundings } from "../domain/lot-unit-decrease";

// ロットの換算（1個＝110g など）で引くときの端数の扱い（この端末だけに保存する）。初期値は、切り上げ。
export const lotRoundingItem = enumStorageItem<LotRounding>({
	key: storageKeys.lotRounding,
	values: lotRoundings,
	defaultValue: "up",
});
