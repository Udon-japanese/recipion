import { createApiApp } from "#/api/create-api-app";
import { minimumClientVersions } from "#/config/client-versions";
import { createDb } from "#/db/client";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { createRecipeOperations } from "#/features/recipes/api/recipe-operations";
import { createDrizzleShoppingSyncRepository } from "#/features/shopping/infrastructure/drizzle-shopping-sync-repository";
import { createAuth } from "#/integrations/better-auth/auth";
import { resolveSession } from "#/integrations/better-auth/resolve-session";

// 本番の API。Better Auth と DB をつなぐ（テストは create-api-app を使う）。
export const apiApp = createApiApp({
	handleAuth: async (request) => {
		const { db } = await createDb();

		return createAuth(db).handler(request);
	},
	minimumClientVersions,
	shoppingSync: {
		resolveSession,
		createStore: ({ db, userId }) =>
			createDrizzleShoppingSyncRepository(db, userId),
	},
	inventory: {
		resolveSession,
		createRepository: ({ db, userId }) =>
			createDrizzleInventoryRepository(db, userId),
	},
	recipes: { resolveSession, createOperations: createRecipeOperations },
});
