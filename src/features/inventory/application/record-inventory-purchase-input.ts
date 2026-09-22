import * as v from "valibot";
import { inventoryUnitCodeSchema } from "../domain/inventory-unit";
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

const recordInventoryPurchaseInputSchema = v.object({
	transactionId: v.pipe(v.string(), v.uuid("取引IDが不正です")),
	shoppingItemId: v.pipe(v.string(), v.uuid("買い物項目IDが不正です")),
	ingredientName: requiredTextSchema,
	stockUnitCode: inventoryUnitCodeSchema,
	stockUnitLabel: requiredTextSchema,
	trackingMode: v.optional(v.picklist(["exact", "estimated"]), "estimated"),
	inputQuantity: positiveQuantitySchema,
	inputUnitCode: requiredTextSchema,
	stockQuantityPerInputUnit: positiveQuantitySchema,
});

export function parseRecordInventoryPurchaseInput(
	input: unknown,
): RecordInventoryPurchaseInput {
	return v.parse(recordInventoryPurchaseInputSchema, input);
}
