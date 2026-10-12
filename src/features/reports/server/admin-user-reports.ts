import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { generateHandle } from "#/features/profile/domain/profile";
import { requireAdmin } from "#/integrations/cloudflare-access/require-admin";
import { resolvedHistoryLimit } from "../domain/report";
import { resolveUserNameReportInputSchema } from "../domain/user-report";
import { createDrizzleUserReportRepository } from "../infrastructure/drizzle-user-report-repository";

// 未対応のユーザー名の通報の一覧（管理者だけ）。
export const listOpenUserReportsServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db } = await requireAdmin();

	return createDrizzleUserReportRepository(db).listOpen();
});

// 対応済みのユーザー名の通報の履歴（管理者だけ。新しい順）。
export const listResolvedUserReportsServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db } = await requireAdmin();

	return createDrizzleUserReportRepository(db).listResolved(
		resolvedHistoryLimit,
	);
});

// ユーザー名の通報への対応（名前を初期値に戻す・却下する。管理者だけ）。
export const resolveUserReportServerFn = createServerFn({ method: "POST" })
	.validator((input) => v.parse(resolveUserNameReportInputSchema, input))
	.handler(async ({ data }) => {
		const { db } = await requireAdmin();

		return createDrizzleUserReportRepository(db).resolve({
			reportId: data.reportId,
			action: data.action,
			generateHandle: () =>
				generateHandle((size) => {
					const [value] = crypto.getRandomValues(new Uint32Array(1));

					return (value ?? 0) % size;
				}),
			now: new Date(),
		});
	});
