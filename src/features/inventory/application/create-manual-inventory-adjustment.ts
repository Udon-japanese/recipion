import type { InventoryOperation } from "../domain/apply-inventory-adjustment";
import type { InventoryLotAllocation } from "../domain/inventory-lot";
import type { InventoryUnitCode } from "../domain/inventory-unit";
import { parseAdjustInventoryInput } from "./adjust-inventory-input";
import type { InventoryAdjustmentCommand } from "./inventory-adjustment-repository";

export type CreateManualInventoryAdjustmentInput = {
	inventoryItemId: string;
	quantity: number;
	stockUnitCode: InventoryUnitCode;
	operation: InventoryOperation;
	// 減らすとき、ロットごとの数量を指定する（省略は、期限の早いロットから自動）。
	allocations?: InventoryLotAllocation[];
};

export function createManualInventoryAdjustment(
	input: CreateManualInventoryAdjustmentInput,
	transactionId: string = crypto.randomUUID(),
): InventoryAdjustmentCommand {
	return parseAdjustInventoryInput({
		transactionId,
		inventoryItemId: input.inventoryItemId,
		inputQuantity: input.quantity,
		inputUnitCode: input.stockUnitCode,
		stockQuantityPerInputUnit: 1,
		operation: input.operation,
		reason: "manual-adjustment",
		allocations: input.allocations,
	});
}
