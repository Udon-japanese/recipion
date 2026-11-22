import { type Context, Hono } from "hono";

import type { ResolveSession } from "#/api/middleware/session";
import { validate } from "#/api/validate";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import { createReportInputSchema } from "../domain/report";
import { createUserNameReportInputSchema } from "../domain/user-report";
import type { ReportOperations } from "./report-operations";

export type ReportRouteDependencies = {
	resolveSession: ResolveSession;
	createOperations: (session: ResolvedSession) => ReportOperations;
};

// 通報の API（/api/v1/reports）。結果（created など）は { result } で返す。
export function createReportRoutes(dependencies: ReportRouteDependencies) {
	async function operationsFor(c: Context) {
		return dependencies.createOperations(
			await dependencies.resolveSession(c.req.raw.headers),
		);
	}

	return new Hono()
		.post("/recipes", validate("json", createReportInputSchema), async (c) =>
			c.json(
				{
					result: await (await operationsFor(c)).reportRecipe(
						c.req.valid("json"),
					),
				},
				200,
			),
		)
		.post(
			"/users",
			validate("json", createUserNameReportInputSchema),
			async (c) =>
				c.json(
					{
						result: await (await operationsFor(c)).reportUserName(
							c.req.valid("json"),
						),
					},
					200,
				),
		);
}
