import { syncInventoryPurchaseOutbox } from "../application/sync-inventory-purchase-outbox";
import { createDexieInventoryPurchaseOutboxRepository } from "./dexie-inventory-purchase-outbox-repository";
import type { InventoryPurchaseOwnerScope } from "./inventory-purchase-outbox";
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
