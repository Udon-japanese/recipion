import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { AuthPanel } from "#/features/auth/components/auth-panel";
import { adjustInventoryWithCache } from "#/features/inventory/application/adjust-inventory-with-cache";
import { adoptGuestInventoryPurchases } from "#/features/inventory/application/adopt-guest-inventory-purchases";
import type { InventoryAdjustmentCommand } from "#/features/inventory/application/inventory-adjustment-repository";
import { loadInventoryItemsWithCache } from "#/features/inventory/application/load-inventory-items-with-cache";
import { GuestPurchaseAdoption } from "#/features/inventory/components/guest-purchase-adoption";
import { InventoryList } from "#/features/inventory/components/inventory-list";
import { InventoryPurchaseSync } from "#/features/inventory/components/inventory-purchase-sync";
import { createDexieInventoryCacheRepository } from "#/features/inventory/infrastructure/dexie-inventory-cache-repository";
import { createDexieInventoryPurchaseOutboxRepository } from "#/features/inventory/infrastructure/dexie-inventory-purchase-outbox-repository";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/infrastructure/inventory-purchase-outbox";
import { syncDexieInventoryPurchaseOutbox } from "#/features/inventory/infrastructure/sync-dexie-inventory-purchase-outbox";
import { adjustInventory as adjustInventoryServerFn } from "#/features/inventory/server/adjust-inventory";
import { listInventoryItemsServerFn } from "#/features/inventory/server/list-inventory-items";
import { RecipeEditor } from "#/features/recipes/components/recipe-editor";
import { createRecipeServerFn } from "#/features/recipes/server/create-recipe";
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

function ShoppingPage() {
	const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);

	const { data: session, isPending } = authClient.useSession();

	const ownerScope: InventoryPurchaseOwnerScope | null = isPending
		? null
		: session
			? `user:${session.user.id}`
			: "guest";

	const loadInventoryItems = useCallback(async () => {
		if (!ownerScope || ownerScope === "guest") {
			throw new Error("在庫を取得できるユーザーではありません");
		}

		return loadInventoryItemsWithCache(
			ownerScope,
			() => listInventoryItemsServerFn(),
			createDexieInventoryCacheRepository(),
		);
	}, [ownerScope]);

	const adjustInventoryItem = useCallback(
		async (command: InventoryAdjustmentCommand) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("在庫を調整できるユーザーではありません");
			}

			return adjustInventoryWithCache(
				ownerScope,
				command,
				(adjustmentCommand) =>
					adjustInventoryServerFn({
						data: adjustmentCommand,
					}),
				createDexieInventoryCacheRepository(),
			);
		},
		[ownerScope],
	);

	const syncPurchases = useCallback(
		async (scope: InventoryPurchaseOwnerScope) => {
			const result = await syncDexieInventoryPurchaseOutbox(scope);

			if (result.syncedCount > 0) {
				setInventoryRefreshKey((currentKey) => currentKey + 1);
			}

			return result;
		},
		[],
	);

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
			<AuthPanel />

			<GuestPurchaseAdoption
				ownerScope={ownerScope}
				loadGuestPurchaseCount={loadGuestPurchaseCount}
				adoptGuestPurchases={adoptGuestPurchasesForUser}
			/>

			<InventoryPurchaseSync
				ownerScope={ownerScope}
				syncPurchases={syncPurchases}
			/>

			<InventoryList
				ownerScope={ownerScope}
				loadInventoryItems={loadInventoryItems}
				adjustInventoryItem={adjustInventoryItem}
				refreshKey={inventoryRefreshKey}
			/>

			<ShoppingList ownerScope={ownerScope} syncPurchases={syncPurchases} />

			{ownerScope !== null && ownerScope !== "guest" ? (
				<RecipeEditor
					onSave={(document) => createRecipeServerFn({ data: document })}
				/>
			) : null}
		</>
	);
}
