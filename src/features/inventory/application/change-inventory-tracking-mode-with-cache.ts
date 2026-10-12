import type {
	InventoryCacheOwnerScope,
	InventoryCacheRepository,
} from "./inventory-cache-repository";
import type {
	ChangeInventoryTrackingModeCommand,
	ChangeInventoryTrackingModeResult,
} from "./inventory-tracking-mode-repository";

type ChangeRemoteTrackingMode = (
	command: ChangeInventoryTrackingModeCommand,
) => Promise<ChangeInventoryTrackingModeResult>;

/** 管理方法を変え、在庫のキャッシュ（管理方法・数量・ロット）も更新する。 */
export async function changeInventoryTrackingModeWithCache(
	ownerScope: InventoryCacheOwnerScope,
	command: ChangeInventoryTrackingModeCommand,
	changeRemote: ChangeRemoteTrackingMode,
	cacheRepository: InventoryCacheRepository,
	now = new Date(),
): Promise<ChangeInventoryTrackingModeResult> {
	const result = await changeRemote(command);

	try {
		await cacheRepository.updateStock(
			ownerScope,
			command.inventoryItemId,
			{
				quantity: result.quantity,
				lots: result.lots,
				trackingMode: result.trackingMode,
			},
			now,
		);
	} catch {
		// サーバー側の変更は完了しているので、キャッシュの更新だけの失敗では、操作を失敗にしない。
	}

	return result;
}
