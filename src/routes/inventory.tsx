import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { pageTitle } from "#/config/app";
import { IngredientDictionaryScope } from "#/features/ingredients/components/ingredient-dictionary-context";
import { useIngredientDictionaryWithActions } from "#/features/ingredients/hooks/use-ingredient-dictionary";
import type { AdjustInventoryInput } from "#/features/inventory/application/adjust-inventory-input";
import { adjustInventoryWithCache } from "#/features/inventory/application/adjust-inventory-with-cache";
import { changeInventoryTrackingModeWithCache } from "#/features/inventory/application/change-inventory-tracking-mode-with-cache";
import type {
	ChangeStockUnitCommand,
	RenameInventoryItemCommand,
	SetInventoryItemArtCommand,
} from "#/features/inventory/application/inventory-item-management-repository";
import type { UpdateInventoryLotCommand } from "#/features/inventory/application/inventory-lot-repository";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { userIdOfOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { ChangeInventoryTrackingModeCommand } from "#/features/inventory/application/inventory-tracking-mode-repository";
import { loadInventoryItemsWithCache } from "#/features/inventory/application/load-inventory-items-with-cache";
import {
	changeStockUnitWithCache,
	deleteInventoryItemWithCache,
	renameInventoryItemWithCache,
	setInventoryItemArtWithCache,
} from "#/features/inventory/application/manage-inventory-item-with-cache";
import type { RegisterInventoryItemInput } from "#/features/inventory/application/register-inventory-item";
import { updateInventoryLotWithCache } from "#/features/inventory/application/update-inventory-lot-with-cache";
import { InventoryList } from "#/features/inventory/components/inventory-list";
import { PurchaseOutboxSync } from "#/features/inventory/components/purchase-outbox-sync";
import { useExpiryEstimateLevel } from "#/features/inventory/hooks/use-expiry-estimate-level";
import { useIngredientExpiryDefaults } from "#/features/inventory/hooks/use-ingredient-expiry-defaults";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { createDexieInventoryCacheRepository } from "#/features/inventory/infrastructure/dexie-inventory-cache-repository";
import * as inventoryApi from "#/features/inventory/infrastructure/inventory-api";
import { syncDexieInventoryPurchaseOutbox } from "#/features/inventory/infrastructure/sync-dexie-inventory-purchase-outbox";
import { onAppRefreshRequest } from "#/features/pull-refresh/infrastructure/app-refresh-request";

export const Route = createFileRoute("/inventory")({
	head: () => ({ meta: [{ title: pageTitle("在庫") }] }),
	ssr: false,
	component: InventoryPage,
});

function InventoryPage() {
	const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);

	// 引っ張り更新が終わったら、在庫の一覧を取り直す。
	useEffect(
		() =>
			onAppRefreshRequest(() =>
				setInventoryRefreshKey((currentKey) => currentKey + 1),
			),
		[],
	);

	const ownerScope = useOwnerScope();
	const [expiryEstimateLevel] = useExpiryEstimateLevel();
	// 自分の食材辞書（期限の初期値の照合と、名前の補完に使う）。
	const { dictionary, mergeNames } =
		useIngredientDictionaryWithActions(ownerScope);
	const lookupIngredientDefaults = useIngredientExpiryDefaults(
		ownerScope,
		dictionary,
	);

	const loadInventoryItems = useCallback(async () => {
		if (!ownerScope || ownerScope === "guest") {
			throw new Error("在庫を取得できるユーザーではありません");
		}

		return loadInventoryItemsWithCache(
			ownerScope,
			() =>
				inventoryApi.listInventoryItems({
					expectedUserId: userIdOfOwnerScope(ownerScope),
				}),
			createDexieInventoryCacheRepository(),
		);
	}, [ownerScope]);

	const adjustInventoryItem = useCallback(
		async (command: AdjustInventoryInput) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("在庫を調整できるユーザーではありません");
			}

			return adjustInventoryWithCache(
				ownerScope,
				command,
				(adjustmentCommand) => inventoryApi.adjustInventory(adjustmentCommand),
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
				(updateCommand) => inventoryApi.updateInventoryLot(updateCommand),
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
					inventoryApi.changeInventoryTrackingMode(changeCommand),
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
				(id) => inventoryApi.deleteInventoryItem({ inventoryItemId: id }),
				createDexieInventoryCacheRepository(),
			);
		},
		[ownerScope],
	);

	const setInventoryItemArt = useCallback(
		async (command: SetInventoryItemArtCommand) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("絵を変えられるユーザーではありません");
			}

			return setInventoryItemArtWithCache(
				ownerScope,
				command,
				(artCommand) => inventoryApi.setInventoryItemArt(artCommand),
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
				(renameCommand) => inventoryApi.renameInventoryItem(renameCommand),
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
				(changeCommand) => inventoryApi.changeStockUnit(changeCommand),
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
		async (input: RegisterInventoryItemInput) => {
			if (!ownerScope || ownerScope === "guest") {
				throw new Error("在庫に登録できるユーザーではありません");
			}

			return inventoryApi.registerInventoryItem({
				...input,
				expectedUserId: userIdOfOwnerScope(ownerScope),
			});
		},
		[ownerScope],
	);

	return (
		<IngredientDictionaryScope dictionary={dictionary} mergeNames={mergeNames}>
			<InventoryList
				ownerScope={ownerScope}
				loadInventoryItems={loadInventoryItems}
				adjustInventoryItem={adjustInventoryItem}
				updateInventoryLot={updateInventoryLot}
				changeTrackingMode={changeTrackingMode}
				deleteInventoryItem={deleteInventoryItem}
				renameInventoryItem={renameInventoryItem}
				setInventoryItemArt={setInventoryItemArt}
				changeStockUnit={changeStockUnit}
				refreshKey={inventoryRefreshKey}
				registration={{
					registerInventoryItem,
					expiryEstimateLevel,
					lookupIngredientDefaults,
				}}
				notices={
					<PurchaseOutboxSync
						ownerScope={ownerScope}
						syncPurchases={syncPurchases}
					/>
				}
			/>
		</IngredientDictionaryScope>
	);
}
