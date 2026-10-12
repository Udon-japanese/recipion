import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { adjustInventoryWithCache } from "#/features/inventory/application/adjust-inventory-with-cache";
import { changeInventoryTrackingModeWithCache } from "#/features/inventory/application/change-inventory-tracking-mode-with-cache";
import type { InventoryAdjustmentCommand } from "#/features/inventory/application/inventory-adjustment-repository";
import type {
	ChangeStockUnitCommand,
	RenameInventoryItemCommand,
} from "#/features/inventory/application/inventory-item-management-repository";
import type {
	SetLotQuantityCommand,
	UpdateInventoryLotCommand,
} from "#/features/inventory/application/inventory-lot-repository";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { ChangeInventoryTrackingModeCommand } from "#/features/inventory/application/inventory-tracking-mode-repository";
import { loadInventoryItemsWithCache } from "#/features/inventory/application/load-inventory-items-with-cache";
import {
	changeStockUnitWithCache,
	deleteInventoryItemWithCache,
	renameInventoryItemWithCache,
} from "#/features/inventory/application/manage-inventory-item-with-cache";
import type { RegisterInventoryItemInput } from "#/features/inventory/application/register-inventory-item";
import {
	setLotQuantityWithCache,
	updateInventoryLotWithCache,
} from "#/features/inventory/application/update-inventory-lot-with-cache";
import { ExpiryEstimateSetting } from "#/features/inventory/components/expiry-estimate-setting";
import { InventoryList } from "#/features/inventory/components/inventory-list";
import { InventoryRegistrationForm } from "#/features/inventory/components/inventory-registration-form";
import { PurchaseOutboxSync } from "#/features/inventory/components/purchase-outbox-sync";
import { useExpiryEstimateLevel } from "#/features/inventory/hooks/use-expiry-estimate-level";
import { useIngredientExpiryDefaults } from "#/features/inventory/hooks/use-ingredient-expiry-defaults";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { createDexieInventoryCacheRepository } from "#/features/inventory/infrastructure/dexie-inventory-cache-repository";
import { syncDexieInventoryPurchaseOutbox } from "#/features/inventory/infrastructure/sync-dexie-inventory-purchase-outbox";
import { adjustInventory as adjustInventoryServerFn } from "#/features/inventory/server/adjust-inventory";
import { changeInventoryTrackingModeServerFn } from "#/features/inventory/server/change-inventory-tracking-mode";
import { listInventoryItemsServerFn } from "#/features/inventory/server/list-inventory-items";
import {
	changeStockUnitServerFn,
	deleteInventoryItemServerFn,
	renameInventoryItemServerFn,
} from "#/features/inventory/server/manage-inventory-item";
import { registerInventoryItemServerFn } from "#/features/inventory/server/register-inventory-item";
import {
	setLotQuantityServerFn,
	updateInventoryLotServerFn,
} from "#/features/inventory/server/update-inventory-lot";

export const Route = createFileRoute("/inventory")({
	ssr: false,
	component: InventoryPage,
});

function InventoryPage() {
	const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);

	const ownerScope = useOwnerScope();
	const [expiryEstimateLevel, setExpiryEstimateLevel] =
		useExpiryEstimateLevel();
	const lookupIngredientDefaults = useIngredientExpiryDefaults(ownerScope);

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

	const updateInventoryLot = useCallback(
		async (command: UpdateInventoryLotCommand) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("ロットを更新できるユーザーではありません");
			}

			return updateInventoryLotWithCache(
				ownerScope,
				command,
				(updateCommand) => updateInventoryLotServerFn({ data: updateCommand }),
				createDexieInventoryCacheRepository(),
			);
		},
		[ownerScope],
	);

	const changeTrackingMode = useCallback(
		async (command: ChangeInventoryTrackingModeCommand) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("管理方法を変えられるユーザーではありません");
			}

			return changeInventoryTrackingModeWithCache(
				ownerScope,
				command,
				(changeCommand) =>
					changeInventoryTrackingModeServerFn({ data: changeCommand }),
				createDexieInventoryCacheRepository(),
			);
		},
		[ownerScope],
	);

	const deleteInventoryItem = useCallback(
		async (inventoryItemId: string) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("在庫を削除できるユーザーではありません");
			}

			return deleteInventoryItemWithCache(
				ownerScope,
				inventoryItemId,
				(id) => deleteInventoryItemServerFn({ data: { inventoryItemId: id } }),
				createDexieInventoryCacheRepository(),
			);
		},
		[ownerScope],
	);

	const renameInventoryItem = useCallback(
		async (command: RenameInventoryItemCommand) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("名前を変更できるユーザーではありません");
			}

			return renameInventoryItemWithCache(
				ownerScope,
				command,
				(renameCommand) => renameInventoryItemServerFn({ data: renameCommand }),
				createDexieInventoryCacheRepository(),
			);
		},
		[ownerScope],
	);

	const setLotQuantity = useCallback(
		async (command: SetLotQuantityCommand) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("数量を直せるユーザーではありません");
			}

			return setLotQuantityWithCache(
				ownerScope,
				command,
				(setCommand) => setLotQuantityServerFn({ data: setCommand }),
				createDexieInventoryCacheRepository(),
			);
		},
		[ownerScope],
	);

	const changeStockUnit = useCallback(
		async (command: ChangeStockUnitCommand) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("単位を変えられるユーザーではありません");
			}

			return changeStockUnitWithCache(
				ownerScope,
				command,
				(changeCommand) => changeStockUnitServerFn({ data: changeCommand }),
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

	const registerInventoryItem = useCallback(
		async (input: RegisterInventoryItemInput) =>
			registerInventoryItemServerFn({ data: input }),
		[],
	);

	return (
		<>
			<PurchaseOutboxSync
				ownerScope={ownerScope}
				syncPurchases={syncPurchases}
			/>

			{ownerScope !== null && ownerScope !== "guest" ? (
				<ExpiryEstimateSetting
					level={expiryEstimateLevel}
					onChange={setExpiryEstimateLevel}
				/>
			) : null}

			{ownerScope !== null && ownerScope !== "guest" ? (
				<InventoryRegistrationForm
					expiryEstimateLevel={expiryEstimateLevel}
					lookupIngredientDefaults={lookupIngredientDefaults}
					registerInventoryItem={registerInventoryItem}
					onRegistered={() =>
						setInventoryRefreshKey((currentKey) => currentKey + 1)
					}
				/>
			) : null}

			<InventoryList
				ownerScope={ownerScope}
				loadInventoryItems={loadInventoryItems}
				adjustInventoryItem={adjustInventoryItem}
				updateInventoryLot={updateInventoryLot}
				changeTrackingMode={changeTrackingMode}
				deleteInventoryItem={deleteInventoryItem}
				renameInventoryItem={renameInventoryItem}
				changeStockUnit={changeStockUnit}
				setLotQuantity={setLotQuantity}
				refreshKey={inventoryRefreshKey}
			/>
		</>
	);
}
