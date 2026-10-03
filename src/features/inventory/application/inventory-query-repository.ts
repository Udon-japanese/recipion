import type { InventoryTrackingMode } from "../domain/apply-inventory-adjustment";
import type { InventoryUnitCode } from "../domain/inventory-unit";

export type InventoryListItem = {
	inventoryItemId: string;
	ingredientId: string;
	name: string;
	quantity: number;
	stockUnitCode: InventoryUnitCode;
	stockUnitLabel: string;
	trackingMode: InventoryTrackingMode;
	updatedAt: string;
};

export interface InventoryQueryRepository {
	list(): Promise<InventoryListItem[]>;
}
