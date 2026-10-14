import type {
	InventoryAdjustmentCommand,
	InventoryAdjustmentRepositoryResult,
} from "../../application/inventory-adjustment-repository";
import type {
	ChangeStockUnitCommand,
	ChangeStockUnitResult,
	RenameInventoryItemCommand,
	RenameInventoryItemResult,
} from "../../application/inventory-item-management-repository";
import type {
	SetLotQuantityCommand,
	SetLotQuantityResult,
	UpdateInventoryLotCommand,
	UpdateInventoryLotResult,
} from "../../application/inventory-lot-repository";
import type {
	ChangeInventoryTrackingModeCommand,
	ChangeInventoryTrackingModeResult,
} from "../../application/inventory-tracking-mode-repository";

// 在庫の食材に対する操作。渡されたものだけ、パネルにボタンが出る。
export type InventoryActions = {
	adjustInventoryItem?: (
		command: InventoryAdjustmentCommand,
	) => Promise<InventoryAdjustmentRepositoryResult>;
	updateInventoryLot?: (
		command: UpdateInventoryLotCommand,
	) => Promise<UpdateInventoryLotResult>;
	changeTrackingMode?: (
		command: ChangeInventoryTrackingModeCommand,
	) => Promise<ChangeInventoryTrackingModeResult>;
	setLotQuantity?: (
		command: SetLotQuantityCommand,
	) => Promise<SetLotQuantityResult>;
	changeStockUnit?: (
		command: ChangeStockUnitCommand,
	) => Promise<ChangeStockUnitResult>;
	deleteInventoryItem?: (inventoryItemId: string) => Promise<boolean>;
	renameInventoryItem?: (
		command: RenameInventoryItemCommand,
	) => Promise<RenameInventoryItemResult>;
};
