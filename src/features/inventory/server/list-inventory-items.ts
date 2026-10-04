import { createServerFn } from "@tanstack/react-start";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

export const listInventoryItemsServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db, userId } = await requireSession();

	const repository = createDrizzleInventoryRepository(db, userId);

	return repository.list();
});
