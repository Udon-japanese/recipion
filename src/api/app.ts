import { createApiApp } from "#/api/create-api-app";
import { minimumClientVersions } from "#/config/client-versions";
import { createDb } from "#/db/client";
import { createAdminOperations } from "#/features/admin/api/admin-operations";
import { createBackupOperations } from "#/features/backup/api/backup-operations";
import { createDrizzleIngredientDictionaryRepository } from "#/features/ingredients/infrastructure/drizzle-ingredient-dictionary-repository";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { createModerationOperations } from "#/features/moderation/api/moderation-operations";
import { createMeOperations } from "#/features/profile/api/me-operations";
import { createRecipeOperations } from "#/features/recipes/api/recipe-operations";
import { createReportOperations } from "#/features/reports/api/report-operations";
import { createDrizzleShoppingSyncRepository } from "#/features/shopping/infrastructure/drizzle-shopping-sync-repository";
import { createAuth } from "#/integrations/better-auth/auth";
import { resolveSession } from "#/integrations/better-auth/resolve-session";
import { requireAdmin } from "#/integrations/cloudflare-access/require-admin";

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
	me: { resolveSession, createOperations: createMeOperations },
	moderation: { resolveSession, createOperations: createModerationOperations },
	reports: { resolveSession, createOperations: createReportOperations },
	ingredientDictionary: {
		resolveSession,
		createRepository: ({ db, userId }) =>
			createDrizzleIngredientDictionaryRepository(db, userId),
	},
	backup: { resolveSession, createOperations: createBackupOperations },
	admin: {
		resolveAdmin: requireAdmin,
		createOperations: createAdminOperations,
	},
});
