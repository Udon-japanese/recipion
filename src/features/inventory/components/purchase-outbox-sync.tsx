import { useCallback } from "react";
import { adoptGuestInventoryPurchases } from "../application/adopt-guest-inventory-purchases";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import type { SyncInventoryPurchaseOutboxResult } from "../application/sync-inventory-purchase-outbox";
import { createDexieInventoryPurchaseOutboxRepository } from "../infrastructure/dexie-inventory-purchase-outbox-repository";
import { GuestPurchaseAdoption } from "./guest-purchase-adoption";
import { InventoryPurchaseSync } from "./inventory-purchase-sync";

type SyncPurchases = (
	ownerScope: InventoryPurchaseOwnerScope,
) => Promise<SyncInventoryPurchaseOutboxResult>;

async function loadGuestPurchaseCount(): Promise<number> {
	const repository = createDexieInventoryPurchaseOutboxRepository();

	const entries = await repository.list("guest");

	return entries.length;
}

type PurchaseOutboxSyncProps = {
	ownerScope: InventoryPurchaseOwnerScope | null;
	syncPurchases: SyncPurchases;
};

export function PurchaseOutboxSync({
	ownerScope,
	syncPurchases,
}: PurchaseOutboxSyncProps) {
	const adoptGuestPurchasesForUser = useCallback(
		(scope: InventoryPurchaseOwnerScope) => {
			return adoptGuestInventoryPurchases(scope, {
				outboxRepository: createDexieInventoryPurchaseOutboxRepository(),
				syncPurchases,
			});
		},
		[syncPurchases],
	);

	return (
		<>
			<GuestPurchaseAdoption
				ownerScope={ownerScope}
				loadGuestPurchaseCount={loadGuestPurchaseCount}
				adoptGuestPurchases={adoptGuestPurchasesForUser}
			/>

			<InventoryPurchaseSync
				ownerScope={ownerScope}
				syncPurchases={syncPurchases}
			/>
		</>
	);
}
