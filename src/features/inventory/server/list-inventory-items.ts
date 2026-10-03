import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { createDb } from "#/db/client";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { createAuth } from "#/integrations/better-auth/auth";

export const listInventoryItemsServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db } = await createDb();
	const auth = createAuth(db);

	const session = await auth.api.getSession({
		headers: getRequestHeaders(),
	});

	if (!session) {
		throw new Error("認証が必要です");
	}

	const repository = createDrizzleInventoryRepository(db, session.user.id);

	return repository.list();
});
