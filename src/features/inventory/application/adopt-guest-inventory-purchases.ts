import type { InventoryPurchaseOwnerScope } from "../infrastructure/inventory-purchase-outbox";
import type { InventoryPurchaseOutboxRepository } from "./inventory-purchase-outbox-repository";
import type { SyncInventoryPurchaseOutboxResult } from "./sync-inventory-purchase-outbox";

type SyncPurchases = (
	ownerScope: InventoryPurchaseOwnerScope,
) => Promise<SyncInventoryPurchaseOutboxResult>;

export type AdoptGuestInventoryPurchasesDependencies = {
	outboxRepository: InventoryPurchaseOutboxRepository;
	syncPurchases: SyncPurchases;
};

export type AdoptGuestInventoryPurchasesResult = {
	adoptedCount: number;
	syncResult: SyncInventoryPurchaseOutboxResult | null;
};

export async function adoptGuestInventoryPurchases(
	ownerScope: InventoryPurchaseOwnerScope,
	dependencies: AdoptGuestInventoryPurchasesDependencies,
): Promise<AdoptGuestInventoryPurchasesResult> {
	if (ownerScope === "guest") {
		throw new Error("ゲスト購入の引き継ぎにはログインが必要です");
	}

	const adoptedCount = await dependencies.outboxRepository.reassignOwnerScope(
		"guest",
		ownerScope,
	);

	if (adoptedCount === 0) {
		return {
			adoptedCount: 0,
			syncResult: null,
		};
	}

	const syncResult = await dependencies.syncPurchases(ownerScope);

	return {
		adoptedCount,
		syncResult,
	};
}
