import type {
	InventoryCacheOwnerScope,
	InventoryCacheRepository,
	InventoryCacheSnapshot,
} from "#/features/inventory/application/inventory-cache-repository";

type CacheMethod =
	| "find"
	| "save"
	| "updateStock"
	| "removeItem"
	| "updateDisplayName";

export type FakeInventoryCacheRepository = InventoryCacheRepository & {
	// 次の呼び出しを1回だけ失敗させる。
	failNext(method: CacheMethod, error?: unknown): void;
};

// メモリ上で本当に動く偽の在庫キャッシュ。保存先の動きは Dexie 版と同じにしてある。
export function createFakeInventoryCacheRepository(
	initial: readonly InventoryCacheSnapshot[] = [],
): FakeInventoryCacheRepository {
	const snapshots = new Map<InventoryCacheOwnerScope, InventoryCacheSnapshot>(
		initial.map((snapshot) => [snapshot.ownerScope, snapshot]),
	);
	const failures = new Map<CacheMethod, unknown>();

	const guard = (method: CacheMethod) => {
		if (failures.has(method)) {
			const error = failures.get(method);

			failures.delete(method);
			throw error;
		}
	};

	return {
		failNext(method, error = new Error(`${method} failed`)) {
			failures.set(method, error);
		},

		async find(ownerScope) {
			guard("find");

			return snapshots.get(ownerScope);
		},

		async save(ownerScope, items, now = new Date()) {
			guard("save");

			const snapshot: InventoryCacheSnapshot = {
				ownerScope,
				items: [...items],
				cachedAt: now.toISOString(),
			};

			snapshots.set(ownerScope, snapshot);

			return snapshot;
		},

		async removeItem(ownerScope, inventoryItemId, now = new Date()) {
			guard("removeItem");

			const snapshot = snapshots.get(ownerScope);

			if (!snapshot) {
				return;
			}

			snapshots.set(ownerScope, {
				...snapshot,
				items: snapshot.items.filter(
					(item) => item.inventoryItemId !== inventoryItemId,
				),
				cachedAt: now.toISOString(),
			});
		},

		async updateDisplayName(
			ownerScope,
			inventoryItemId,
			displayName,
			now = new Date(),
		) {
			guard("updateDisplayName");

			const snapshot = snapshots.get(ownerScope);

			if (!snapshot) {
				return;
			}

			snapshots.set(ownerScope, {
				...snapshot,
				items: snapshot.items.map((item) =>
					item.inventoryItemId === inventoryItemId
						? { ...item, displayName, updatedAt: now.toISOString() }
						: item,
				),
				cachedAt: now.toISOString(),
			});
		},

		async updateStock(ownerScope, inventoryItemId, stock, now = new Date()) {
			guard("updateStock");

			const snapshot = snapshots.get(ownerScope);

			if (!snapshot) {
				return;
			}

			snapshots.set(ownerScope, {
				...snapshot,
				items: snapshot.items.map((item) =>
					item.inventoryItemId === inventoryItemId
						? {
								...item,
								quantity: stock.quantity,
								lots: [...stock.lots],
								...(stock.defaultExpiryKind !== undefined
									? { defaultExpiryKind: stock.defaultExpiryKind }
									: {}),
								...(stock.defaultStorage !== undefined
									? { defaultStorage: stock.defaultStorage }
									: {}),
								...(stock.trackingMode !== undefined
									? { trackingMode: stock.trackingMode }
									: {}),
								...(stock.stockUnitCode !== undefined
									? { stockUnitCode: stock.stockUnitCode }
									: {}),
								...(stock.stockUnitLabel !== undefined
									? { stockUnitLabel: stock.stockUnitLabel }
									: {}),
								updatedAt: now.toISOString(),
							}
						: item,
				),
				cachedAt: now.toISOString(),
			});
		},
	};
}
