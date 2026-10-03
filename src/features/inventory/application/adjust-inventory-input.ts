import * as v from "valibot";

import type { InventoryAdjustmentCommand } from "./inventory-adjustment-repository";

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

export const adjustInventoryInputSchema = v.object({
	transactionId: v.pipe(v.string(), v.uuid("取引IDが不正です")),
	inventoryItemId: v.pipe(v.string(), v.uuid("在庫項目IDが不正です")),
	inputQuantity: positiveQuantitySchema,
	inputUnitCode: requiredTextSchema,
	stockQuantityPerInputUnit: positiveQuantitySchema,
	operation: v.picklist(["increase", "decrease"]),
	reason: v.picklist(["purchase", "recipe-consumption", "manual-adjustment"]),
	sourceType: v.optional(v.picklist(["shopping-item", "recipe"])),
	sourceId: v.optional(requiredTextSchema),
});

export function parseAdjustInventoryInput(
	input: unknown,
): InventoryAdjustmentCommand {
	return v.parse(adjustInventoryInputSchema, input);
}
