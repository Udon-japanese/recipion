import { useStorageItem } from "#/local-storage/use-storage-item";
import type { ExpiryEstimateLevel } from "../domain/estimate-lot-expiry";
import { expiryEstimateLevelItem } from "../infrastructure/expiry-estimate-level-storage";

// 期限の目安の設定（この端末に保存）。サーバーと最初の描画は、既定値で、ブラウザで、保存した値に切り替わる。他のタブでの変更も、反映される。
export function useExpiryEstimateLevel(): [
	ExpiryEstimateLevel,
	(level: ExpiryEstimateLevel) => void,
] {
	return useStorageItem(expiryEstimateLevelItem);
}
