import * as v from "valibot";
import { inventoryTrackingModeSchema } from "../domain/inventory-tracking-mode";
import { inventoryUnitCodeSchema } from "../domain/inventory-unit";
import type {
	InventoryAdjustmentRepository,
	InventoryAdjustmentRepositoryResult,
} from "./inventory-adjustment-repository";
import type {
	InventoryItemResolver,
	ResolvedInventoryItem,
} from "./inventory-item-resolver";
import { inventoryLotInputSchema } from "./inventory-lot-input";
import type { InventoryTrackingModeRepository } from "./inventory-tracking-mode-repository";

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
	trackingMode: v.optional(inventoryTrackingModeSchema, "estimated"),
	// 0 は「数量を入れずに、食材だけ登録する」（塩のように、有無だけを知りたい食材など）。
	initialQuantity: v.pipe(
		v.number(),
		v.finite("数量には有限の数値を指定してください"),
		v.minValue(0, "数量は0以上にしてください"),
	),
	// 「ある」で登録する（量を追わない食材向け。管理方法は「有無だけ」になる）。initialQuantity は使わない。
	markAsAvailable: v.optional(v.boolean(), false),
	// 追加する数量の、保存方法・期限など。
	lot: v.optional(inventoryLotInputSchema),
});

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
	// 「ある」で登録するとき、すでにある（量を追う）食材を「有無だけ」に切り替えるために使う。
	inventoryTrackingModeRepository: InventoryTrackingModeRepository;
};

export type RegisterInventoryItemResult = {
	inventoryItem: ResolvedInventoryItem;
	// 初期数量を入れたときの結果。0 のときは null。
	adjustment: InventoryAdjustmentRepositoryResult | null;
};

/**
 * 買い物メモを経由せず、在庫に食材を直接登録する。
 * すでに同じ食材の在庫があるときは、新しく作らず、初期数量だけを足す（取引IDが同じなら、二重には足さない）。
 * 「ある」（markAsAvailable）のときは、管理方法を「有無だけ」にして、「ある」にする。
 * すでに量を追っている食材で、在庫が 0 より多ければ、何もしない（すでにある）。在庫が 0 なら、「有無だけ」に切り替える。
 */
export async function registerInventoryItem(
	input: RegisterInventoryItemInput,
	dependencies: RegisterInventoryItemDependencies,
): Promise<RegisterInventoryItemResult> {
	const resolved =
		await dependencies.inventoryItemResolver.resolveOrCreateInventoryItem({
			ingredientName: input.ingredientName,
			stockUnitCode: input.stockUnitCode,
			stockUnitLabel: input.stockUnitLabel,
			// 「ある」は、有無だけで登録する（すでにある食材は、下で切り替える）。
			trackingMode: input.markAsAvailable ? "presence" : input.trackingMode,
		});

	let inventoryItem = resolved;

	if (input.markAsAvailable) {
		// すでにある（在庫が 0 より多い）なら、何もしない。
		if (resolved.quantity > 0) {
			return { inventoryItem, adjustment: null };
		}

		// 在庫が 0 の、量を追う食材は、「有無だけ」に切り替えてから、「ある」にする。
		if (resolved.trackingMode !== "presence") {
			await dependencies.inventoryTrackingModeRepository.changeTrackingMode({
				inventoryItemId: resolved.inventoryItemId,
				trackingMode: "presence",
			});
			inventoryItem = { ...resolved, trackingMode: "presence" };
		}
	}

	// 「ある」は、有無だけの食材に 1 つのロットを足す（量は、入力しない）。
	const quantityToAdd = input.markAsAvailable ? 1 : input.initialQuantity;

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
			lot: input.lot,
		});

	return { inventoryItem, adjustment };
}
