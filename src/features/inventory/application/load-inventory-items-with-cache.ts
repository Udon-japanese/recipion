import type {
	InventoryCacheOwnerScope,
	InventoryCacheRepository,
} from "./inventory-cache-repository";
import type { InventoryListItem } from "./inventory-query-repository";

export type InventoryItemsSource = "network" | "cache";

export type LoadInventoryItemsResult = {
	items: InventoryListItem[];
	source: InventoryItemsSource;
	cachedAt: string | null;
};

type LoadRemoteInventoryItems = () => Promise<InventoryListItem[]>;

export async function loadInventoryItemsWithCache(
	ownerScope: InventoryCacheOwnerScope,
	loadRemoteItems: LoadRemoteInventoryItems,
	cacheRepository: InventoryCacheRepository,
	now = new Date(),
): Promise<LoadInventoryItemsResult> {
	try {
		const items = await loadRemoteItems();

		try {
			const snapshot = await cacheRepository.save(ownerScope, items, now);

			return {
				items,
				source: "network",
				cachedAt: snapshot.cachedAt,
			};
		} catch {
			/*
			 * ローカルキャッシュの保存失敗だけで、
			 * サーバーから取得できた在庫まで非表示にはしない。
			 */
			return {
				items,
				source: "network",
				cachedAt: null,
			};
		}
	} catch (networkError) {
		const snapshot = await cacheRepository.find(ownerScope);

		if (!snapshot) {
			throw networkError;
		}

		return {
			items: snapshot.items,
			source: "cache",
			cachedAt: snapshot.cachedAt,
		};
	}
}
