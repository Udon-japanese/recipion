import type { InventoryPurchaseOwnerScope } from "../infrastructure/inventory-purchase-outbox";
import type { InventoryPurchaseOutboxRepository } from "./inventory-purchase-outbox-repository";
import type { RecordInventoryPurchaseInput } from "./record-inventory-purchase";

export interface InventoryPurchaseSender {
	send(payload: RecordInventoryPurchaseInput): Promise<void>;
}

export type SyncInventoryPurchaseOutboxResult = {
	syncedCount: number;
	failedEntryId: string | null;
};

export async function syncInventoryPurchaseOutbox(
	ownerScope: InventoryPurchaseOwnerScope,
	outboxRepository: InventoryPurchaseOutboxRepository,
	sender: InventoryPurchaseSender,
): Promise<SyncInventoryPurchaseOutboxResult> {
	const entries = await outboxRepository.list(ownerScope);
	let syncedCount = 0;

	for (const entry of entries) {
		try {
			await sender.send(entry.payload);
			await outboxRepository.remove(entry.id);
			syncedCount += 1;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "送信に失敗しました";

			await outboxRepository.markFailed(entry.id, errorMessage);

			return {
				syncedCount,
				failedEntryId: entry.id,
			};
		}
	}

	return {
		syncedCount,
		failedEntryId: null,
	};
}
