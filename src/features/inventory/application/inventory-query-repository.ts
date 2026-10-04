import type { InventoryTrackingMode } from "../domain/apply-inventory-adjustment";
import type { InventoryLot } from "../domain/inventory-lot";
import type { InventoryUnitCode } from "../domain/inventory-unit";

export type InventoryListItem = {
	inventoryItemId: string;
	ingredientId: string;
	name: string;
	// ロットの数量の合計。
	quantity: number;
	// 在庫のあるロット（期限の早い順）。
	lots: InventoryLot[];
	stockUnitCode: InventoryUnitCode;
	stockUnitLabel: string;
	trackingMode: InventoryTrackingMode;
	updatedAt: string;
};

export interface InventoryQueryRepository {
	list(): Promise<InventoryListItem[]>;
}
