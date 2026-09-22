import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { createDb } from "#/db/client";
import { recordInventoryPurchase } from "#/features/inventory/application/record-inventory-purchase";
import { parseRecordInventoryPurchaseInput } from "#/features/inventory/application/record-inventory-purchase-input";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { createAuth } from "#/integrations/better-auth/auth";

export const recordInventoryPurchaseServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => {
		return parseRecordInventoryPurchaseInput(input);
	})
	.handler(async ({ data }) => {
		const { db } = await createDb();
		const auth = createAuth(db);

		const session = await auth.api.getSession({
			headers: getRequestHeaders(),
		});

		if (!session) {
			throw new Error("認証が必要です");
		}

		const repository = createDrizzleInventoryRepository(db, session.user.id);

		return recordInventoryPurchase(data, {
			inventoryItemResolver: repository,
			inventoryRepository: repository,
		});
	});
