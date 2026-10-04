import type { InventoryLot } from "../domain/inventory-lot";
import type { InventoryListItem } from "./inventory-query-repository";

export type InventoryCacheOwnerScope = `user:${string}`;

export type InventoryCacheSnapshot = {
	ownerScope: InventoryCacheOwnerScope;
	items: InventoryListItem[];
	cachedAt: string;
};

export interface InventoryCacheRepository {
	find(
		ownerScope: InventoryCacheOwnerScope,
	): Promise<InventoryCacheSnapshot | undefined>;

	save(
		ownerScope: InventoryCacheOwnerScope,
		items: readonly InventoryListItem[],
		now?: Date,
	): Promise<InventoryCacheSnapshot>;

	// 操作後の、食材の数量（ロットの合計）と、在庫のあるロットを保存する。
	updateStock(
		ownerScope: InventoryCacheOwnerScope,
		inventoryItemId: string,
		stock: { quantity: number; lots: readonly InventoryLot[] },
		now?: Date,
	): Promise<void>;
}
