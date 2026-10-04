import { createServerFn } from "@tanstack/react-start";
import {
	adjustInventoryInputSchema,
	parseAdjustInventoryInput,
} from "#/features/inventory/application/adjust-inventory-input";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

export const adjustInventory = createServerFn({
	method: "POST",
})
	.validator((input) => {
		return parseAdjustInventoryInput(input);
	})
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		const repository = createDrizzleInventoryRepository(db, userId);

		return repository.applyAdjustment(data);
	});

export { adjustInventoryInputSchema };
