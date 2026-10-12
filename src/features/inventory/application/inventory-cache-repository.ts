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

	// 在庫の食材を、キャッシュから消す。
	removeItem(
		ownerScope: InventoryCacheOwnerScope,
		inventoryItemId: string,
		now?: Date,
	): Promise<void>;

	// 在庫の一覧に出す呼び名を、キャッシュに反映する。
	updateDisplayName(
		ownerScope: InventoryCacheOwnerScope,
		inventoryItemId: string,
		displayName: string | null,
		now?: Date,
	): Promise<void>;

	// 操作後の、食材の数量（ロットの合計）と、在庫のあるロットを保存する。
	updateStock(
		ownerScope: InventoryCacheOwnerScope,
		inventoryItemId: string,
		stock: {
			quantity: number;
			lots: readonly InventoryLot[];
			defaultExpiryKind?: InventoryListItem["defaultExpiryKind"];
			defaultStorage?: InventoryListItem["defaultStorage"];
			trackingMode?: InventoryListItem["trackingMode"];
		},
		now?: Date,
	): Promise<void>;
}
