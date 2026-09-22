import type {
	InventoryPurchaseOutboxEntry,
	InventoryPurchaseOwnerScope,
} from "../infrastructure/inventory-purchase-outbox";

export interface InventoryPurchaseOutboxRepository {
	enqueue(entry: InventoryPurchaseOutboxEntry): Promise<void>;

	list(
		ownerScope: InventoryPurchaseOwnerScope,
	): Promise<InventoryPurchaseOutboxEntry[]>;

	markFailed(id: string, errorMessage: string, now?: Date): Promise<void>;

	reassignOwnerScope(
		from: InventoryPurchaseOwnerScope,
		to: InventoryPurchaseOwnerScope,
		now?: Date,
	): Promise<number>;

	remove(id: string): Promise<void>;
}
