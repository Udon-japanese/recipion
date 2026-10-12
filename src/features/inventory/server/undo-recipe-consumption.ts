import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

const undoRecipeConsumptionInputSchema = v.object({
	sourceId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
});

export const undoRecipeConsumptionServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => v.parse(undoRecipeConsumptionInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleInventoryRepository(db, userId).undoRecipeConsumption(
			data.sourceId,
		);
	});
