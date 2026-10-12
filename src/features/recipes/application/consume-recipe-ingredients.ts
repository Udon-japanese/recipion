import { adjustInventoryWithCache } from "#/features/inventory/application/adjust-inventory-with-cache";
import type {
	InventoryAdjustmentCommand,
	InventoryAdjustmentRepositoryResult,
	UndoRecipeConsumptionResult,
} from "#/features/inventory/application/inventory-adjustment-repository";
import type {
	InventoryCacheOwnerScope,
	InventoryCacheRepository,
} from "#/features/inventory/application/inventory-cache-repository";
import type {
	RecipeConsumptionAlternative,
	RecipeConsumptionRow,
} from "../domain/plan-recipe-consumption";

export type RecipeConsumptionEntry = {
	needId: string;
	inventoryItemId: string;
	// 引く量（在庫の単位）。
	quantity: number;
	stockUnitCode: string;
	// 再送しても二重に引かないよう、操作を始めるときに決めておく。
	transactionId: string;
};

export type RecipeConsumptionOperation = {
	// この操作の履歴を見つけるための印（取り消しで使う）。
	sourceId: string;
	entries: RecipeConsumptionEntry[];
};

export type RecipeConsumptionEntryResult =
	| { needId: string; ok: true }
	| { needId: string; ok: false; error: unknown };

/** 引く行（deduct があるもの）から、操作を作る。 */
export function startRecipeConsumption(
	recipePublicId: string,
	rows: readonly RecipeConsumptionRow[],
	createId: () => string = () => crypto.randomUUID(),
): RecipeConsumptionOperation {
	return {
		sourceId: `${recipePublicId}:${createId()}`,
		entries: rows.flatMap((row) =>
			row.target && row.deduct !== null && row.deduct > 0
				? [
						{
							needId: row.need.id,
							inventoryItemId: row.target.inventoryItemId,
							quantity: row.deduct,
							stockUnitCode: row.target.stockUnitCode,
							transactionId: createId(),
						},
					]
				: [],
		),
	};
}

/**
 * 在庫にない材料の行に、形が決まっている代わりの食材（冷凍玉ねぎ(みじん切り)など）から引く分を足す。
 * 同じ操作の印（sourceId）に足すので、全体を「元に戻す」で、まとめて戻せる。
 * 引くのは、足したあとで、runRecipeConsumption（その行だけ）を呼んで行う。
 */
export function addAlternativeConsumption(
	operation: RecipeConsumptionOperation,
	row: RecipeConsumptionRow,
	alternative: RecipeConsumptionAlternative,
	createId: () => string = () => crypto.randomUUID(),
): { operation: RecipeConsumptionOperation; row: RecipeConsumptionRow } {
	return {
		operation: {
			...operation,
			entries: [
				...operation.entries,
				{
					needId: row.need.id,
					inventoryItemId: alternative.inventoryItemId,
					quantity: alternative.deduct,
					stockUnitCode: alternative.stockUnitCode,
					transactionId: createId(),
				},
			],
		},
		row: {
			...row,
			status: "consume",
			target: {
				inventoryItemId: alternative.inventoryItemId,
				name: alternative.name,
				stockUnitCode: alternative.stockUnitCode,
				stockUnitLabel: alternative.stockUnitLabel,
			},
			deduct: alternative.deduct,
			required: alternative.deduct,
			viaStandIn: true,
			alternatives: [],
		},
	};
}

type AdjustRemoteInventory = (
	command: InventoryAdjustmentCommand,
) => Promise<InventoryAdjustmentRepositoryResult>;

/**
 * 操作の行を、順に在庫から引く。1行が失敗しても、残りは続ける（失敗した行は、結果に残る）。
 * 失敗した行だけ、同じ操作でもう一度呼べる（取引 ID が同じなので、引き済みの行は二重に引かない）。
 */
export async function runRecipeConsumption(
	ownerScope: InventoryCacheOwnerScope,
	operation: RecipeConsumptionOperation,
	adjustRemoteInventory: AdjustRemoteInventory,
	cacheRepository: InventoryCacheRepository,
	onlyNeedIds?: ReadonlySet<string>,
): Promise<RecipeConsumptionEntryResult[]> {
	const results: RecipeConsumptionEntryResult[] = [];

	for (const entry of operation.entries) {
		if (onlyNeedIds && !onlyNeedIds.has(entry.needId)) {
			continue;
		}

		try {
			await adjustInventoryWithCache(
				ownerScope,
				{
					transactionId: entry.transactionId,
					inventoryItemId: entry.inventoryItemId,
					inputQuantity: entry.quantity,
					inputUnitCode: entry.stockUnitCode,
					stockQuantityPerInputUnit: 1,
					operation: "decrease",
					reason: "recipe-consumption",
					sourceType: "recipe",
					sourceId: operation.sourceId,
				},
				adjustRemoteInventory,
				cacheRepository,
			);
			results.push({ needId: entry.needId, ok: true });
		} catch (error) {
			results.push({ needId: entry.needId, ok: false, error });
		}
	}

	return results;
}

/** 引いた分を戻し、在庫のキャッシュも更新する。 */
export async function undoRecipeConsumptionWithCache(
	ownerScope: InventoryCacheOwnerScope,
	sourceId: string,
	undoRemote: (sourceId: string) => Promise<UndoRecipeConsumptionResult>,
	cacheRepository: InventoryCacheRepository,
	now = new Date(),
): Promise<UndoRecipeConsumptionResult> {
	const result = await undoRemote(sourceId);

	for (const item of result.items) {
		try {
			await cacheRepository.updateStock(
				ownerScope,
				item.inventoryItemId,
				{ quantity: item.quantity, lots: item.lots },
				now,
			);
		} catch {
			// サーバーの取り消しは完了しているので、キャッシュ更新だけの失敗は、結果にしない。
		}
	}

	return result;
}
