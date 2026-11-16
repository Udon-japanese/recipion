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
	// undone: 戻した / already-undone: 対象は、すべて戻してある / nothing-to-undo: 戻す履歴がない。
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

export type CorrectRecipeConsumptionCommand = {
	// 再送しても二重に直さないための印。
	transactionId: string;
	// 「作った」の操作の印。
	sourceId: string;
	inventoryItemId: string;
	// 直したあとの、この操作で引いた量（在庫の単位。0 より大きい。0 にするのは、1行の「戻す」）。
	quantity: number;
};

export type CorrectRecipeConsumptionResult = {
	status: "applied" | "already-applied";
	// 直したあとの、この操作で引いた量（在庫の単位）。
	consumedQuantity: number;
	// 食材の、操作後の数量とロット（キャッシュの更新に使う）。
	quantity: number;
	lots: InventoryLot[];
};

export interface RecipeConsumptionCorrectionRepository {
	// 「作った」で引いた量を、直す（足りなければ期限の早いロットから引き、多ければ引いたロットへ戻す）。
	// 戻したあとの食材・在庫の単位を変えた食材は、直せない。
	correctRecipeConsumption(
		command: CorrectRecipeConsumptionCommand,
	): Promise<CorrectRecipeConsumptionResult>;
}

export interface RecipeConsumptionUndoRepository {
	// 「作った」で引いた分（同じ sourceId の履歴。「直す」で増減した分も含めた合計）を、引いたロットへ戻す。二重には戻さない（食材ごとに判定）。
	// inventoryItemIds を渡すと、その食材の分だけを戻す（1行ずつの「戻す」）。省略は、まだ戻していない全部。
	undoRecipeConsumption(
		sourceId: string,
		inventoryItemIds?: readonly string[],
	): Promise<UndoRecipeConsumptionResult>;
}
