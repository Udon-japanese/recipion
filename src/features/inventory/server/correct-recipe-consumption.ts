import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

const idSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200));

const correctRecipeConsumptionInputSchema = v.object({
	transactionId: idSchema,
	sourceId: idSchema,
	inventoryItemId: idSchema,
	// 直したあとの、引いた量（在庫の単位）。0 にするのは、1行の「戻す」。
	quantity: v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(1_000_000)),
});

export const correctRecipeConsumptionServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => v.parse(correctRecipeConsumptionInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleInventoryRepository(
			db,
			userId,
		).correctRecipeConsumption(data);
	});
