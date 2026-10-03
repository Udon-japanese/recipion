import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { adjustInventoryWithCache } from "#/features/inventory/application/adjust-inventory-with-cache";
import type { InventoryAdjustmentCommand } from "#/features/inventory/application/inventory-adjustment-repository";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { loadInventoryItemsWithCache } from "#/features/inventory/application/load-inventory-items-with-cache";
import { InventoryList } from "#/features/inventory/components/inventory-list";
import { PurchaseOutboxSync } from "#/features/inventory/components/purchase-outbox-sync";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { createDexieInventoryCacheRepository } from "#/features/inventory/infrastructure/dexie-inventory-cache-repository";
import { syncDexieInventoryPurchaseOutbox } from "#/features/inventory/infrastructure/sync-dexie-inventory-purchase-outbox";
import { adjustInventory as adjustInventoryServerFn } from "#/features/inventory/server/adjust-inventory";
import { listInventoryItemsServerFn } from "#/features/inventory/server/list-inventory-items";

export const Route = createFileRoute("/inventory")({
	component: InventoryPage,
});

function InventoryPage() {
	const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);

	const ownerScope = useOwnerScope();

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

	return (
		<>
			<PurchaseOutboxSync
				ownerScope={ownerScope}
				syncPurchases={syncPurchases}
			/>

			<InventoryList
				ownerScope={ownerScope}
				loadInventoryItems={loadInventoryItems}
				adjustInventoryItem={adjustInventoryItem}
				refreshKey={inventoryRefreshKey}
			/>
		</>
	);
}
