import { createServerFn } from "@tanstack/react-start";
import {
	parseSetLotQuantityInput,
	parseUpdateInventoryLotInput,
} from "#/features/inventory/application/update-inventory-lot-input";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

export const updateInventoryLotServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => {
		return parseUpdateInventoryLotInput(input);
	})
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		const repository = createDrizzleInventoryRepository(db, userId);

		return repository.updateLot(data);
	});

export const setLotQuantityServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => parseSetLotQuantityInput(input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleInventoryRepository(db, userId).setLotQuantity(data);
	});
