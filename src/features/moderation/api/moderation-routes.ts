import { type Context, Hono } from "hono";

import type { ResolveSession } from "#/api/middleware/session";
import { validate } from "#/api/validate";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import { appealInputSchema } from "../domain/appeal";
import type { ModerationOperations } from "./moderation-operations";

export type ModerationRouteDependencies = {
	resolveSession: ResolveSession;
	createOperations: (session: ResolvedSession) => ModerationOperations;
};

// 停止の状態と申し立ての API（/api/v1/moderation）。
// 停止中のユーザーが、停止の画面を見て申し立てるためのものなので、停止中でも通す（ほかの API は 403）。
export function createModerationRoutes(
	dependencies: ModerationRouteDependencies,
) {
	async function operationsFor(c: Context) {
		return dependencies.createOperations(
			await dependencies.resolveSession(c.req.raw.headers, {
				allowSuspended: true,
			}),
		);
	}

	return new Hono()
		.get("/account-status", async (c) =>
			c.json({ status: await (await operationsFor(c)).accountStatus() }, 200),
		)
		.post("/appeals", validate("json", appealInputSchema), async (c) =>
			c.json(
				await (await operationsFor(c)).submitAppeal(
					c.req.valid("json").message,
				),
				200,
			),
		);
}
