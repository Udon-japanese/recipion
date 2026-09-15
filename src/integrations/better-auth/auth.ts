import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import type { DB } from "#/db/client";
import * as authSchema from "#/integrations/better-auth/auth.sql";

export function createAuth(db: DB) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: authSchema,
		}),
		emailAndPassword: {
			enabled: true,
		},
		plugins: [tanstackStartCookies()],
	});
}
