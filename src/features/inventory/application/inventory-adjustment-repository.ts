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

export type UndoRecipeConsumptionResult = {
	// undone: 戻した / already-undone: すでに戻してある / nothing-to-undo: 戻す履歴がない。
	status: "undone" | "already-undone" | "nothing-to-undo";
	// 戻した食材の、操作後の数量とロット（キャッシュの更新に使う）。
	items: {
		inventoryItemId: string;
		quantity: number;
		lots: InventoryLot[];
	}[];
	// 入れたできあがり（作り置き）のうち、すでに使っていて、取り消せなかった量（回分）。なければ 0。
	unreturnedProduction: number;
};

export interface InventoryAdjustmentRepository {
	applyAdjustment(
		command: InventoryAdjustmentCommand,
	): Promise<InventoryAdjustmentRepositoryResult>;
}

export interface MadeRecipeStockRepository {
	// 「作った」で在庫に入れる、できあがりの食材（なければ作る）の ID。自分のレシピだけ。
	ensureMadeRecipeItem(
		recipePublicId: string,
	): Promise<{ inventoryItemId: string }>;
}

export interface RecipeConsumptionUndoRepository {
	// 「作った」で引いた分（同じ sourceId の履歴）を、引いたロットへ戻す。二重には戻さない。
	undoRecipeConsumption(sourceId: string): Promise<UndoRecipeConsumptionResult>;
}
