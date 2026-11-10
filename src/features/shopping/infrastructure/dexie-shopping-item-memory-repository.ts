import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { getLocalDatabase } from "#/local-db/database";
import type { ShoppingItemMemoryRepository } from "../application/shopping-item-memory-repository";

// その持ち主の、食材ごとのいつもの買い方。
export function createDexieShoppingItemMemoryRepository(
	ownerScope: InventoryPurchaseOwnerScope,
): ShoppingItemMemoryRepository {
	return {
		async list() {
			const records = await getLocalDatabase()
				.scopedShoppingItemMemories.where("ownerScope")
				.equals(ownerScope)
				.toArray();

			return Object.fromEntries(
				records.map(({ ownerScope: _ownerScope, ...memory }) => [
					memory.nameKey,
					memory,
				]),
			);
		},

		async setAll(memories) {
			await getLocalDatabase().scopedShoppingItemMemories.bulkPut(
				memories.map((memory) => ({ ...memory, ownerScope })),
			);
		},
	};
}
