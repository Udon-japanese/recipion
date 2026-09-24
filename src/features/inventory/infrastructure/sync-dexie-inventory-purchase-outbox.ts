import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import { syncInventoryPurchaseOutbox } from "../application/sync-inventory-purchase-outbox";
import { createDexieInventoryPurchaseOutboxRepository } from "./dexie-inventory-purchase-outbox-repository";
import { tanstackInventoryPurchaseSender } from "./tanstack-inventory-purchase-sender";

export function syncDexieInventoryPurchaseOutbox(
	ownerScope: InventoryPurchaseOwnerScope,
) {
	return syncInventoryPurchaseOutbox(
		ownerScope,
		createDexieInventoryPurchaseOutboxRepository(),
		tanstackInventoryPurchaseSender,
	);
}
