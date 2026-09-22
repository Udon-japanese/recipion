import { createFileRoute } from "@tanstack/react-router";

import { AuthPanel } from "#/features/auth/components/auth-panel";
import { InventoryPurchaseSync } from "#/features/inventory/components/inventory-purchase-sync";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/infrastructure/inventory-purchase-outbox";
import { syncDexieInventoryPurchaseOutbox } from "#/features/inventory/infrastructure/sync-dexie-inventory-purchase-outbox";
import { ShoppingList } from "#/features/shopping/components/shopping-list";
import { authClient } from "#/integrations/better-auth/auth-client";

export const Route = createFileRoute("/")({
	component: ShoppingPage,
});

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
