import type {
	InventoryCacheOwnerScope,
	InventoryCacheRepository,
} from "./inventory-cache-repository";
import type {
	UpdateInventoryLotCommand,
	UpdateInventoryLotResult,
} from "./inventory-lot-repository";

type UpdateRemoteInventoryLot = (
	command: UpdateInventoryLotCommand,
) => Promise<UpdateInventoryLotResult>;

export async function updateInventoryLotWithCache(
	ownerScope: InventoryCacheOwnerScope,
	command: UpdateInventoryLotCommand,
	updateRemoteLot: UpdateRemoteInventoryLot,
	cacheRepository: InventoryCacheRepository,
	now = new Date(),
): Promise<UpdateInventoryLotResult> {
	const result = await updateRemoteLot(command);

	try {
		await cacheRepository.updateStock(
			ownerScope,
			result.inventoryItemId,
			{
				quantity: result.quantity,
				lots: result.lots,
				defaultExpiryKind: result.defaultExpiryKind,
				defaultStorage: result.defaultStorage,
			},
			now,
		);
	} catch {
		/*
		 * サーバー側の更新は完了しているため、
		 * キャッシュ更新だけの失敗では、操作結果を失敗にしない。
		 */
	}

	return result;
}
