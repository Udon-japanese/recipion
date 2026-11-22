import { createApiApp } from "#/api/create-api-app";
import { minimumClientVersions } from "#/config/client-versions";
import { createDb } from "#/db/client";
import { createAuth } from "#/integrations/better-auth/auth";

// 本番の API。Better Auth と DB をつなぐ（テストは create-api-app を使う）。
export const apiApp = createApiApp({
	handleAuth: async (request) => {
		const { db } = await createDb();

		return createAuth(db).handler(request);
	},
	minimumClientVersions,
});
