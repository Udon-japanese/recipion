import { type Context, Hono } from "hono";
import * as v from "valibot";

import { validate } from "#/api/validate";
import type { DB } from "#/db/client";
import { resolveAppealInputSchema } from "#/features/moderation/domain/appeal";
import { resolveReportInputSchema } from "#/features/reports/domain/report";
import { resolveUserNameReportInputSchema } from "#/features/reports/domain/user-report";
import {
	adminUserSearchInputSchema,
	liftSuspensionInputSchema,
	suspendUserInputSchema,
} from "../domain/admin-user";
import type { AdminOperations } from "./admin-operations";

export type AdminRouteDependencies = {
	// 管理者か確かめる（Cloudflare Access のトークンと ADMIN_EMAILS）。管理者でなければ NOT_FOUND を投げる。
	resolveAdmin: (headers: Headers) => Promise<{ db: DB; adminEmail: string }>;
	createOperations: (admin: { db: DB }) => AdminOperations;
};

const reportIdQuerySchema = v.object({
	reportId: v.pipe(v.string(), v.uuid()),
});

// 管理者の API（/api/v1/admin）。どのルートも、まず管理者かを確かめる。
// 管理者でない人には、404（「見つかりませんでした」）を返し、管理者の API があることを知らせない。
// 対応の結果（文字列など）は { result } で返す。
export function createAdminRoutes(dependencies: AdminRouteDependencies) {
	async function operationsFor(c: Context) {
		return dependencies.createOperations(
			await dependencies.resolveAdmin(c.req.raw.headers),
		);
	}

	return (
		new Hono()
			// 管理者の画面を開いてよいか（画面の入口で確かめる）。
			.get("/check", async (c) => {
				await dependencies.resolveAdmin(c.req.raw.headers);

				return c.json({ admin: true as const }, 200);
			})
			.get("/summary", async (c) =>
				c.json(await (await operationsFor(c)).summary(), 200),
			)
			.get("/users", validate("query", adminUserSearchInputSchema), async (c) =>
				c.json(
					await (await operationsFor(c)).searchUsers(
						c.req.valid("query").query,
					),
					200,
				),
			)
			.post(
				"/users/suspend",
				validate("json", suspendUserInputSchema),
				async (c) =>
					c.json(
						{
							result: await (await operationsFor(c)).suspendUser(
								c.req.valid("json"),
							),
						},
						200,
					),
			)
			.post(
				"/users/lift",
				validate("json", liftSuspensionInputSchema),
				async (c) =>
					c.json(
						{
							result: await (await operationsFor(c)).liftSuspension(
								c.req.valid("json").userId,
							),
						},
						200,
					),
			)
			.get("/appeals", async (c) =>
				c.json(await (await operationsFor(c)).listOpenAppeals(), 200),
			)
			.get("/appeals/resolved", async (c) =>
				c.json(await (await operationsFor(c)).listResolvedAppeals(), 200),
			)
			.post(
				"/appeals/resolve",
				validate("json", resolveAppealInputSchema),
				async (c) =>
					c.json(
						{
							result: await (await operationsFor(c)).resolveAppeal(
								c.req.valid("json"),
							),
						},
						200,
					),
			)
			.get("/reports", async (c) =>
				c.json(await (await operationsFor(c)).listOpenReports(), 200),
			)
			.get("/reports/resolved", async (c) =>
				c.json(await (await operationsFor(c)).listResolvedReports(), 200),
			)
			.get(
				"/reports/recipe",
				validate("query", reportIdQuerySchema),
				async (c) =>
					c.json(
						await (await operationsFor(c)).getReportedRecipe(
							c.req.valid("query").reportId,
						),
						200,
					),
			)
			.post(
				"/reports/resolve",
				validate("json", resolveReportInputSchema),
				async (c) =>
					c.json(
						{
							result: await (await operationsFor(c)).resolveReport(
								c.req.valid("json"),
							),
						},
						200,
					),
			)
			.get("/user-reports", async (c) =>
				c.json(await (await operationsFor(c)).listOpenUserReports(), 200),
			)
			.get("/user-reports/resolved", async (c) =>
				c.json(await (await operationsFor(c)).listResolvedUserReports(), 200),
			)
			.post(
				"/user-reports/resolve",
				validate("json", resolveUserNameReportInputSchema),
				async (c) =>
					c.json(
						{
							result: await (await operationsFor(c)).resolveUserReport(
								c.req.valid("json"),
							),
						},
						200,
					),
			)
	);
}
