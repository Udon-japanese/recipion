import type {
	InventoryAdjustmentCommand,
	InventoryAdjustmentRepositoryResult,
} from "./inventory-adjustment-repository";
import type {
	InventoryCacheOwnerScope,
	InventoryCacheRepository,
} from "./inventory-cache-repository";

type AdjustRemoteInventory = (
	command: InventoryAdjustmentCommand,
) => Promise<InventoryAdjustmentRepositoryResult>;

export async function adjustInventoryWithCache(
	ownerScope: InventoryCacheOwnerScope,
	command: InventoryAdjustmentCommand,
	adjustRemoteInventory: AdjustRemoteInventory,
	cacheRepository: InventoryCacheRepository,
	now = new Date(),
): Promise<InventoryAdjustmentRepositoryResult> {
	const result = await adjustRemoteInventory(command);

	try {
		await cacheRepository.updateStock(
			ownerScope,
			command.inventoryItemId,
			{ quantity: result.quantity, lots: result.lots },
			now,
		);
	} catch {
		/*
		 * サーバー側の在庫調整は完了しているため、
		 * キャッシュ更新だけの失敗では操作結果を失敗にしない。
		 */
	}

	return result;
}
