import { createServerFn } from "@tanstack/react-start";
import {
	parseRegisterInventoryItemInput,
	registerInventoryItem,
} from "#/features/inventory/application/register-inventory-item";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

export const registerInventoryItemServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => {
		return parseRegisterInventoryItemInput(input);
	})
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		const repository = createDrizzleInventoryRepository(db, userId);

		return registerInventoryItem(data, {
			inventoryItemResolver: repository,
			inventoryAdjustmentRepository: repository,
			inventoryTrackingModeRepository: repository,
		});
	});
