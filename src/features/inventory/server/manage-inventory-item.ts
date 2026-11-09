import { createServerFn } from "@tanstack/react-start";
import {
	parseChangeStockUnitInput,
	parseDeleteInventoryItemInput,
	parseRenameInventoryItemInput,
	parseSetInventoryItemArtInput,
} from "#/features/inventory/application/inventory-item-management-input";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

export const deleteInventoryItemServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => parseDeleteInventoryItemInput(input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleInventoryRepository(db, userId).deleteItem(
			data.inventoryItemId,
		);
	});

export const renameInventoryItemServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => parseRenameInventoryItemInput(input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleInventoryRepository(db, userId).renameItem(data);
	});

export const setInventoryItemArtServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => parseSetInventoryItemArtInput(input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleInventoryRepository(db, userId).setItemArt(data);
	});

export const changeStockUnitServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => parseChangeStockUnitInput(input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleInventoryRepository(db, userId).changeStockUnit(data);
	});
