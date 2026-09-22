import type { ApplyInventoryAdjustmentInput } from "../domain/apply-inventory-adjustment";

export type InventoryAdjustmentCommand = Omit<
	ApplyInventoryAdjustmentInput,
	"currentQuantity" | "trackingMode" | "stockUnitCode"
>;

export type InventoryAdjustmentRepositoryResult = {
	status: "applied" | "already-applied";
	transactionId: string;
	quantity: number;
};

export interface InventoryRepository {
	applyAdjustment(
		command: InventoryAdjustmentCommand,
	): Promise<InventoryAdjustmentRepositoryResult>;
}
