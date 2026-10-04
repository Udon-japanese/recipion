import { createServerFn } from "@tanstack/react-start";
import { recordInventoryPurchase } from "#/features/inventory/application/record-inventory-purchase";
import { parseRecordInventoryPurchaseInput } from "#/features/inventory/application/record-inventory-purchase-input";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

export const recordInventoryPurchaseServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => {
		return parseRecordInventoryPurchaseInput(input);
	})
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		const repository = createDrizzleInventoryRepository(db, userId);

		return recordInventoryPurchase(data, {
			inventoryItemResolver: repository,
			inventoryAdjustmentRepository: repository,
		});
	});
