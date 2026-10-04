import * as v from "valibot";
import { inventoryUnitCodeSchema } from "../domain/inventory-unit";
import type {
	InventoryAdjustmentRepository,
	InventoryAdjustmentRepositoryResult,
} from "./inventory-adjustment-repository";
import type {
	InventoryItemResolver,
	ResolvedInventoryItem,
} from "./inventory-item-resolver";

const requiredTextSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "値を入力してください"),
);

const registerInventoryItemInputSchema = v.object({
	transactionId: v.pipe(v.string(), v.uuid("取引IDが不正です")),
	ingredientName: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "食材名を入力してください"),
	),
	stockUnitCode: inventoryUnitCodeSchema,
	stockUnitLabel: requiredTextSchema,
	trackingMode: v.optional(v.picklist(["exact", "estimated"]), "estimated"),
	// 0 は「数量を入れずに、食材だけ登録する」（塩のように、有無だけを知りたい食材など）。
	initialQuantity: v.pipe(
		v.number(),
		v.finite("数量には有限の数値を指定してください"),
		v.minValue(0, "数量は0以上にしてください"),
	),
	// 「ある」の目印だけを付ける（数量を追わない食材向け）。initialQuantity は使わない。
	markAsAvailable: v.optional(v.boolean(), false),
});

// 「ある」の目印にする数量（在庫の単位で1）。「少々」「適量」の判定は、在庫が0より多いかだけを見る。
export const AVAILABLE_MARKER_QUANTITY = 1;

export type RegisterInventoryItemInput = v.InferOutput<
	typeof registerInventoryItemInputSchema
>;

export function parseRegisterInventoryItemInput(
	input: unknown,
): RegisterInventoryItemInput {
	return v.parse(registerInventoryItemInputSchema, input);
}

export type RegisterInventoryItemDependencies = {
	inventoryItemResolver: InventoryItemResolver;
	inventoryAdjustmentRepository: InventoryAdjustmentRepository;
};

export type RegisterInventoryItemResult = {
	inventoryItem: ResolvedInventoryItem;
	// 初期数量を入れたときの結果。0 のときは null。
	adjustment: InventoryAdjustmentRepositoryResult | null;
};

/**
 * 買い物メモを経由せず、在庫に食材を直接登録する。
 * すでに同じ食材の在庫があるときは、新しく作らず、初期数量だけを足す（取引IDが同じなら、二重には足さない）。
 */
export async function registerInventoryItem(
	input: RegisterInventoryItemInput,
	dependencies: RegisterInventoryItemDependencies,
): Promise<RegisterInventoryItemResult> {
	const inventoryItem =
		await dependencies.inventoryItemResolver.resolveOrCreateInventoryItem({
			ingredientName: input.ingredientName,
			stockUnitCode: input.stockUnitCode,
			stockUnitLabel: input.stockUnitLabel,
			trackingMode: input.trackingMode,
		});

	// 「ある」は、まだ在庫が0のときだけ、目印の数量を入れる（すでにあれば、何もしない）。
	const quantityToAdd = input.markAsAvailable
		? inventoryItem.quantity > 0
			? 0
			: AVAILABLE_MARKER_QUANTITY
		: input.initialQuantity;

	if (quantityToAdd === 0) {
		return { inventoryItem, adjustment: null };
	}

	// 入力の数量は、その在庫の単位で受け取る（すでに別の単位で登録済みなら、その単位に従う）。
	const adjustment =
		await dependencies.inventoryAdjustmentRepository.applyAdjustment({
			transactionId: input.transactionId,
			inventoryItemId: inventoryItem.inventoryItemId,
			inputQuantity: quantityToAdd,
			inputUnitCode: inventoryItem.stockUnitCode,
			stockQuantityPerInputUnit: 1,
			operation: "increase",
			reason: "manual-adjustment",
		});

	return { inventoryItem, adjustment };
}
