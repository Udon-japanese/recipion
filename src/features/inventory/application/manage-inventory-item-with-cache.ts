import type {
	InventoryCacheOwnerScope,
	InventoryCacheRepository,
} from "./inventory-cache-repository";
import type {
	ChangeStockUnitCommand,
	ChangeStockUnitResult,
	RenameInventoryItemCommand,
	RenameInventoryItemResult,
} from "./inventory-item-management-repository";

/** 在庫の食材を削除し、キャッシュからも消す。見つからなかった（すでに消えている）ときは false。 */
export async function deleteInventoryItemWithCache(
	ownerScope: InventoryCacheOwnerScope,
	inventoryItemId: string,
	deleteRemote: (inventoryItemId: string) => Promise<boolean>,
	cacheRepository: InventoryCacheRepository,
	now = new Date(),
): Promise<boolean> {
	const deleted = await deleteRemote(inventoryItemId);

	try {
		await cacheRepository.removeItem(ownerScope, inventoryItemId, now);
	} catch {
		// サーバー側の削除は完了しているので、キャッシュの更新だけの失敗では、操作を失敗にしない。
	}

	return deleted;
}

/** 在庫の一覧に出す呼び名を変え、キャッシュにも反映する。 */
export async function renameInventoryItemWithCache(
	ownerScope: InventoryCacheOwnerScope,
	command: RenameInventoryItemCommand,
	renameRemote: (
		command: RenameInventoryItemCommand,
	) => Promise<RenameInventoryItemResult>,
	cacheRepository: InventoryCacheRepository,
	now = new Date(),
): Promise<RenameInventoryItemResult> {
	const result = await renameRemote(command);

	try {
		await cacheRepository.updateDisplayName(
			ownerScope,
			result.inventoryItemId,
			result.displayName,
			now,
		);
	} catch {
		// サーバー側の変更は完了しているので、キャッシュの更新だけの失敗では、操作を失敗にしない。
	}

	return result;
}

/** 在庫の単位を変え、キャッシュ（単位・数量・ロット）にも反映する。 */
export async function changeStockUnitWithCache(
	ownerScope: InventoryCacheOwnerScope,
	command: ChangeStockUnitCommand,
	changeRemote: (
		command: ChangeStockUnitCommand,
	) => Promise<ChangeStockUnitResult>,
	cacheRepository: InventoryCacheRepository,
	now = new Date(),
): Promise<ChangeStockUnitResult> {
	const result = await changeRemote(command);

	try {
		await cacheRepository.updateStock(
			ownerScope,
			result.inventoryItemId,
			{
				quantity: result.quantity,
				lots: result.lots,
				stockUnitCode: result.stockUnitCode,
				stockUnitLabel: result.stockUnitLabel,
			},
			now,
		);
	} catch {
		// サーバー側の変更は完了しているので、キャッシュの更新だけの失敗では、操作を失敗にしない。
	}

	return result;
}
