import * as v from "valibot";
import { itemCategoryIdSchema } from "#/features/item-category/domain/item-category";
import { inventoryTrackingModeSchema } from "../domain/inventory-tracking-mode";
import { inventoryUnitCodeSchema } from "../domain/inventory-unit";
import { inventoryLotInputSchema } from "./inventory-lot-input";
import type { RecordInventoryPurchaseInput } from "./record-inventory-purchase";

const positiveQuantitySchema = v.pipe(
	v.number(),
	v.finite("数量には有限の数値を指定してください"),
	v.gtValue(0, "数量は0より大きい数にしてください"),
);

const requiredTextSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "値を入力してください"),
);

export const recordInventoryPurchaseInputSchema = v.object({
	transactionId: v.pipe(v.string(), v.uuid("取引IDが不正です")),
	shoppingItemId: v.pipe(v.string(), v.uuid("買い物項目IDが不正です")),
	ingredientName: requiredTextSchema,
	stockUnitCode: inventoryUnitCodeSchema,
	stockUnitLabel: requiredTextSchema,
	trackingMode: v.optional(inventoryTrackingModeSchema, "estimated"),
	inputQuantity: positiveQuantitySchema,
	inputUnitCode: requiredTextSchema,
	stockQuantityPerInputUnit: positiveQuantitySchema,
	// 買い物メモのカテゴリ。在庫の項目が未設定のときだけ入る。
	// 移行のため optional（古い画面・送信待ちの古い買い物は送らない）。2026-12-08 以降に、必須（null は可）にする。
	categoryId: v.optional(v.nullable(itemCategoryIdSchema)),
	// 買った日・期限・保存方法（購入確定のときに入力した分）。
	lot: v.optional(inventoryLotInputSchema),
});

export function parseRecordInventoryPurchaseInput(
	input: unknown,
): RecordInventoryPurchaseInput {
	return v.parse(recordInventoryPurchaseInputSchema, input);
}
