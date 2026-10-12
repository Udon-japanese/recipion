import type { InventoryLot } from "../domain/inventory-lot";
import type { InventoryTrackingMode } from "../domain/inventory-tracking-mode";

export type ChangeInventoryTrackingModeCommand = {
	inventoryItemId: string;
	trackingMode: InventoryTrackingMode;
	// 有無だけ → 数量を追う管理に変えるときの、いまの量（在庫の単位）。有無だけの食材は、数量を持たない（内部の 0 か 1 は、
	// ユーザーに見せない）ので、実際の量を入れてもらう。「ない」状態なら、0（または省略）。
	currentQuantity?: number;
};

export type ChangeInventoryTrackingModeResult = {
	inventoryItemId: string;
	trackingMode: InventoryTrackingMode;
	// 操作後の、食材の数量（ロットの合計）と、在庫のあるロット。
	quantity: number;
	lots: InventoryLot[];
};

export interface InventoryTrackingModeRepository {
	changeTrackingMode(
		command: ChangeInventoryTrackingModeCommand,
	): Promise<ChangeInventoryTrackingModeResult>;
}
