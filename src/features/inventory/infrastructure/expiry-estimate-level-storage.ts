import { storageKeys } from "#/local-storage/keys";
import {
	enumStorageItem,
	type KeyValueStorage,
} from "#/local-storage/storage-item";
import type { ExpiryEstimateLevel } from "../domain/estimate-lot-expiry";

export const defaultExpiryEstimateLevel: ExpiryEstimateLevel = "reliable";

// 期限の目安の設定（この端末だけに保存する）。使えない環境では、既定値で動く。
export const expiryEstimateLevelItem = enumStorageItem<ExpiryEstimateLevel>({
	key: storageKeys.expiryEstimateLevel,
	values: ["off", "reliable", "all"],
	defaultValue: defaultExpiryEstimateLevel,
});

export function readExpiryEstimateLevel(
	storage?: KeyValueStorage | null,
): ExpiryEstimateLevel {
	return expiryEstimateLevelItem.read(storage);
}

export function writeExpiryEstimateLevel(
	level: ExpiryEstimateLevel,
	storage?: KeyValueStorage | null,
): void {
	expiryEstimateLevelItem.write(level, storage);
}
