import { createServerFn } from "@tanstack/react-start";
import { createDrizzleAppealRepository } from "#/features/moderation/infrastructure/drizzle-appeal-repository";
import { createDrizzleReportRepository } from "#/features/reports/infrastructure/drizzle-report-repository";
import { requireAdmin } from "#/integrations/cloudflare-access/require-admin";

// 管理者の入口に出す、未対応の件数（管理者だけ）。
export const getAdminSummaryServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db } = await requireAdmin();

	const [openReports, openAppeals] = await Promise.all([
		createDrizzleReportRepository(db).countOpen(),
		createDrizzleAppealRepository(db).countOpen(),
	]);

	return { openReports, openAppeals };
});
