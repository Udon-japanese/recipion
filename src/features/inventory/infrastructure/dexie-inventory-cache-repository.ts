import { getLocalDatabase, type LocalDatabase } from "#/local-db/database";

import type {
	InventoryCacheOwnerScope,
	InventoryCacheRepository,
	InventoryCacheSnapshot,
} from "../application/inventory-cache-repository";

export function createDexieInventoryCacheRepository(
	database: LocalDatabase = getLocalDatabase(),
): InventoryCacheRepository {
	return {
		async find(ownerScope: InventoryCacheOwnerScope) {
			return database.inventorySnapshots.get(ownerScope);
		},

		async save(ownerScope, items, now = new Date()) {
			const snapshot: InventoryCacheSnapshot = {
				ownerScope,
				items: [...items],
				cachedAt: now.toISOString(),
			};

			await database.inventorySnapshots.put(snapshot);

			return snapshot;
		},

		async removeItem(ownerScope, inventoryItemId, now = new Date()) {
			await database.transaction(
				"rw",
				database.inventorySnapshots,
				async () => {
					const snapshot = await database.inventorySnapshots.get(ownerScope);

					if (!snapshot) {
						return;
					}

					await database.inventorySnapshots.put({
						...snapshot,
						items: snapshot.items.filter(
							(item) => item.inventoryItemId !== inventoryItemId,
						),
						cachedAt: now.toISOString(),
					});
				},
			);
		},

		async updateDisplayName(
			ownerScope,
			inventoryItemId,
			displayName,
			now = new Date(),
		) {
			await database.transaction(
				"rw",
				database.inventorySnapshots,
				async () => {
					const snapshot = await database.inventorySnapshots.get(ownerScope);

					if (!snapshot) {
						return;
					}

					await database.inventorySnapshots.put({
						...snapshot,
						items: snapshot.items.map((item) =>
							item.inventoryItemId === inventoryItemId
								? { ...item, displayName, updatedAt: now.toISOString() }
								: item,
						),
						cachedAt: now.toISOString(),
					});
				},
			);
		},

		async updateStock(ownerScope, inventoryItemId, stock, now = new Date()) {
			await database.transaction(
				"rw",
				database.inventorySnapshots,
				async () => {
					const snapshot = await database.inventorySnapshots.get(ownerScope);

					if (!snapshot) {
						return;
					}

					const items = snapshot.items.map((item) =>
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
					);

					await database.inventorySnapshots.put({
						...snapshot,
						items,
						cachedAt: now.toISOString(),
					});
				},
			);
		},
	};
}
