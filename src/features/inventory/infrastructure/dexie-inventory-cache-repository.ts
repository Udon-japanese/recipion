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
	};
}
