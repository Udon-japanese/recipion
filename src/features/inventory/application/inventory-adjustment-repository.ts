import type { ApplyInventoryAdjustmentInput } from "../domain/apply-inventory-adjustment";
import type {
	InventoryLot,
	InventoryLotAllocation,
	InventoryLotInput,
} from "../domain/inventory-lot";

export type InventoryAdjustmentCommand = Omit<
	ApplyInventoryAdjustmentInput,
	"currentQuantity" | "trackingMode" | "stockUnitCode"
> & {
	// 減らすとき、ロットごとの数量（在庫の単位）を指定する。省略すると、期限の早いロットから自動で引く。
	// 指定したときは、inputQuantity などの入力は、記録のためだけに使う。
	allocations?: InventoryLotAllocation[];
	// 追加するとき、ロットの条件（保存方法・期限・買った日）を指定する。省略は、期限なしのロット（今日）。
	lot?: InventoryLotInput;
};

export type InventoryAdjustmentRepositoryResult = {
	status: "applied" | "already-applied";
	transactionId: string;
	// 食材の数量（ロットの合計）。
	quantity: number;
	// 操作後の、在庫のあるロット（期限の早い順）。
	lots: InventoryLot[];
};

export interface InventoryAdjustmentRepository {
	applyAdjustment(
		command: InventoryAdjustmentCommand,
	): Promise<InventoryAdjustmentRepositoryResult>;
}
