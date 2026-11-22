import * as v from "valibot";

const idSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200));

// 「作った」で引いた量を直す。
export const correctRecipeConsumptionInputSchema = v.object({
	transactionId: idSchema,
	sourceId: idSchema,
	inventoryItemId: idSchema,
	// 直したあとの、引いた量（在庫の単位）。0 にするのは、1行の「戻す」。
	quantity: v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(1_000_000)),
});

// 「作った」で引いた分を戻す。
export const undoRecipeConsumptionInputSchema = v.object({
	sourceId: idSchema,
	// 1行ずつ戻すときの、在庫の食材。省略は、全部。
	inventoryItemIds: v.optional(
		v.pipe(
			v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(200))),
			v.maxLength(20),
		),
	),
});
