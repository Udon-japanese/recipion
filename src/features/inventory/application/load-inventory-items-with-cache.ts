import { classifyRequestError } from "#/errors/classify-request-error";
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
	// 保存済みの一覧を出した理由（届かなかった・サーバーの中の失敗）。サーバーから取れたときは null。
	cacheReason: "offline" | "server" | null;
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
				cacheReason: null,
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
				cacheReason: null,
			};
		}
	} catch (error) {
		const kind = classifyRequestError(error);

		// ログインの状態が違う（別のアカウントになった、など）ときは、この人の控えも出さない。
		if (kind === "account") {
			throw error;
		}

		const snapshot = await cacheRepository.find(ownerScope);

		if (!snapshot) {
			throw error;
		}

		return {
			items: snapshot.items,
			source: "cache",
			cachedAt: snapshot.cachedAt,
			cacheReason: kind === "offline" ? "offline" : "server",
		};
	}
}
