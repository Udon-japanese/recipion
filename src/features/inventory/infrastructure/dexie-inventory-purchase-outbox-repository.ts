import { getLocalDatabase, type LocalDatabase } from "#/local-db/database";

import type { InventoryPurchaseOutboxRepository } from "../application/inventory-purchase-outbox-repository";
import type { InventoryPurchaseOwnerScope } from "./inventory-purchase-outbox";

export function createDexieInventoryPurchaseOutboxRepository(
	database: LocalDatabase = getLocalDatabase(),
): InventoryPurchaseOutboxRepository {
	return {
		async enqueue(entry) {
			await database.transaction(
				"rw",
				database.inventoryPurchaseOutbox,
				async () => {
					const existing = await database.inventoryPurchaseOutbox.get(entry.id);

					if (existing) {
						return;
					}

					await database.inventoryPurchaseOutbox.add(entry);
				},
			);
		},

		async list(ownerScope: InventoryPurchaseOwnerScope) {
			return database.inventoryPurchaseOutbox
				.where("ownerScope")
				.equals(ownerScope)
				.sortBy("createdAt");
		},

		async markFailed(id, errorMessage, now = new Date()) {
			await database.transaction(
				"rw",
				database.inventoryPurchaseOutbox,
				async () => {
					const existing = await database.inventoryPurchaseOutbox.get(id);

					if (!existing) {
						return;
					}

					const timestamp = now.toISOString();

					await database.inventoryPurchaseOutbox.update(id, {
						status: "failed",
						attemptCount: existing.attemptCount + 1,
						lastAttemptAt: timestamp,
						lastError: errorMessage,
						updatedAt: timestamp,
					});
				},
			);
		},

		async reassignOwnerScope(from, to, now = new Date()) {
			if (from === to) {
				return 0;
			}

			const timestamp = now.toISOString();

			return database.transaction(
				"rw",
				database.inventoryPurchaseOutbox,
				async () => {
					return database.inventoryPurchaseOutbox
						.where("ownerScope")
						.equals(from)
						.modify((entry) => {
							entry.ownerScope = to;
							entry.updatedAt = timestamp;
						});
				},
			);
		},

		async remove(id) {
			await database.inventoryPurchaseOutbox.delete(id);
		},
	};
}
