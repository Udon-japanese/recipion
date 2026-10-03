import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { createDb } from "#/db/client";
import {
	adjustInventoryInputSchema,
	parseAdjustInventoryInput,
} from "#/features/inventory/application/adjust-inventory-input";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { createAuth } from "#/integrations/better-auth/auth";

export const adjustInventory = createServerFn({
	method: "POST",
})
	.validator((input) => {
		return parseAdjustInventoryInput(input);
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

		return repository.applyAdjustment(data);
	});

export { adjustInventoryInputSchema };
