import type * as v from "valibot";

import { notifyAdminsOf } from "#/features/admin/server/notify-admins";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import type { createReportInputSchema } from "../domain/report";
import type { createUserNameReportInputSchema } from "../domain/user-report";
import { createDrizzleReportRepository } from "../infrastructure/drizzle-report-repository";
import { createDrizzleUserReportRepository } from "../infrastructure/drizzle-user-report-repository";

// 通報の API（/api/v1/reports）の中身。新しい通報が入ったら、管理者に知らせる（送れなくても、通報は成功のまま）。
export function createReportOperations({ db, userId }: ResolvedSession) {
	return {
		// レシピの通報。見られないレシピ、自分のレシピは、通報できない。
		async reportRecipe(input: v.InferOutput<typeof createReportInputSchema>) {
			const result = await createDrizzleReportRepository(db).create({
				reporterUserId: userId,
				...input,
				now: new Date(),
			});

			if (result === "created") {
				await notifyAdminsOf(db, "report");
			}

			return result;
		},

		// ユーザー名（表示名・ハンドル）の通報。自分は、通報できない。
		async reportUserName(
			input: v.InferOutput<typeof createUserNameReportInputSchema>,
		) {
			const result = await createDrizzleUserReportRepository(db).create({
				reporterUserId: userId,
				...input,
				now: new Date(),
			});

			if (result === "created") {
				await notifyAdminsOf(db, "user-report");
			}

			return result;
		},
	};
}

export type ReportOperations = ReturnType<typeof createReportOperations>;
