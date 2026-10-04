import type { ExpiryEstimateLevel } from "../domain/estimate-lot-expiry";

const storageKey = "recipion:expiry-estimate-level";

export const defaultExpiryEstimateLevel: ExpiryEstimateLevel = "reliable";

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

// ブラウザの保存領域は、使えないことがある（プライベートモードなど）。そのときは、既定値で動く。
function getDefaultStorage(): KeyValueStorage | null {
	try {
		return typeof localStorage === "undefined" ? null : localStorage;
	} catch {
		return null;
	}
}

function isLevel(value: unknown): value is ExpiryEstimateLevel {
	return value === "off" || value === "reliable" || value === "all";
}

// 期限の目安の設定（この端末だけに保存する）。
export function readExpiryEstimateLevel(
	storage: KeyValueStorage | null = getDefaultStorage(),
): ExpiryEstimateLevel {
	try {
		const value = storage?.getItem(storageKey);

		return isLevel(value) ? value : defaultExpiryEstimateLevel;
	} catch {
		return defaultExpiryEstimateLevel;
	}
}

export function writeExpiryEstimateLevel(
	level: ExpiryEstimateLevel,
	storage: KeyValueStorage | null = getDefaultStorage(),
): void {
	try {
		storage?.setItem(storageKey, level);
	} catch {
		// 保存できなくても、画面の操作は続ける。
	}
}
