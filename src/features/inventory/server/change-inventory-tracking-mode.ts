import { createServerFn } from "@tanstack/react-start";
import { parseChangeInventoryTrackingModeInput } from "#/features/inventory/application/change-inventory-tracking-mode-input";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

export const changeInventoryTrackingModeServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => parseChangeInventoryTrackingModeInput(input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleInventoryRepository(db, userId).changeTrackingMode(
			data,
		);
	});
