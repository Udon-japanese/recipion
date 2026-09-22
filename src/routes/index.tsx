import { createFileRoute } from "@tanstack/react-router";

import { AuthPanel } from "#/features/auth/components/auth-panel";
import { adoptGuestInventoryPurchases } from "#/features/inventory/application/adopt-guest-inventory-purchases";
import { GuestPurchaseAdoption } from "#/features/inventory/components/guest-purchase-adoption";
import { InventoryPurchaseSync } from "#/features/inventory/components/inventory-purchase-sync";
import { createDexieInventoryPurchaseOutboxRepository } from "#/features/inventory/infrastructure/dexie-inventory-purchase-outbox-repository";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/infrastructure/inventory-purchase-outbox";
import { syncDexieInventoryPurchaseOutbox } from "#/features/inventory/infrastructure/sync-dexie-inventory-purchase-outbox";
import { ShoppingList } from "#/features/shopping/components/shopping-list";
import { authClient } from "#/integrations/better-auth/auth-client";

export const Route = createFileRoute("/")({
	component: ShoppingPage,
});

async function loadGuestPurchaseCount(): Promise<number> {
	const repository = createDexieInventoryPurchaseOutboxRepository();

	const entries = await repository.list("guest");

	return entries.length;
}

async function adoptGuestPurchases(ownerScope: InventoryPurchaseOwnerScope) {
	return adoptGuestInventoryPurchases(ownerScope, {
		outboxRepository: createDexieInventoryPurchaseOutboxRepository(),
		syncPurchases: syncDexieInventoryPurchaseOutbox,
	});
}

function ShoppingPage() {
	const { data: session, isPending } = authClient.useSession();

	const ownerScope: InventoryPurchaseOwnerScope | null = isPending
		? null
		: session
			? `user:${session.user.id}`
			: "guest";

	return (
		<>
			<AuthPanel />

			<GuestPurchaseAdoption
				ownerScope={ownerScope}
				loadGuestPurchaseCount={loadGuestPurchaseCount}
				adoptGuestPurchases={adoptGuestPurchases}
			/>

			<InventoryPurchaseSync
				ownerScope={ownerScope}
				syncPurchases={syncDexieInventoryPurchaseOutbox}
			/>

			<ShoppingList
				ownerScope={ownerScope}
				syncPurchases={syncDexieInventoryPurchaseOutbox}
			/>
		</>
	);
}
