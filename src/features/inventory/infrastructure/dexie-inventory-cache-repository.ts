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

		async updateQuantity(
			ownerScope,
			inventoryItemId,
			quantity,
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

					const items = snapshot.items.map((item) =>
						item.inventoryItemId === inventoryItemId
							? {
									...item,
									quantity,
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
