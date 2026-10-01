import { createFileRoute } from "@tanstack/react-router";
import { PurchaseOutboxSync } from "#/features/inventory/components/purchase-outbox-sync";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { syncDexieInventoryPurchaseOutbox } from "#/features/inventory/infrastructure/sync-dexie-inventory-purchase-outbox";
import { ShoppingList } from "#/features/shopping/components/shopping-list";

export const Route = createFileRoute("/shopping")({
	ssr: false,
	component: ShoppingPage,
});

function ShoppingPage() {
	const ownerScope = useOwnerScope();

	return (
		<>
			<PurchaseOutboxSync
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
