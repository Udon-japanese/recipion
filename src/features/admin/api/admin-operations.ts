import { env } from "cloudflare:workers";
import type * as v from "valibot";

import type { DB } from "#/db/client";
import {
	type resolveAppealInputSchema,
	resolvedAppealHistoryLimit,
} from "#/features/moderation/domain/appeal";
import { createDrizzleAppealRepository } from "#/features/moderation/infrastructure/drizzle-appeal-repository";
import { hashEmailForBan } from "#/features/moderation/infrastructure/hash-email";
import { generateHandle } from "#/features/profile/domain/profile";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import {
	resolvedHistoryLimit,
	type resolveReportInputSchema,
} from "#/features/reports/domain/report";
import type { resolveUserNameReportInputSchema } from "#/features/reports/domain/user-report";
import { createDrizzleReportRepository } from "#/features/reports/infrastructure/drizzle-report-repository";
import { createDrizzleUserReportRepository } from "#/features/reports/infrastructure/drizzle-user-report-repository";
import {
	isAdminEmail,
	parseAdminEmails,
} from "#/integrations/cloudflare-access/access-token";
import {
	adminUserSearchLimit,
	type suspendUserInputSchema,
} from "../domain/admin-user";
import { createDrizzleAdminUserRepository } from "../infrastructure/drizzle-admin-user-repository";

const hashEmail = (email: string) =>
	hashEmailForBan(email, env.BETTER_AUTH_SECRET);

// 管理者の API（/api/v1/admin）の中身。管理者かどうかは、入口（admin-routes.ts）で確かめたあと。
export function createAdminOperations({ db }: { db: DB }) {
	const reports = createDrizzleReportRepository(db);
	const userReports = createDrizzleUserReportRepository(db);
	const appeals = createDrizzleAppealRepository(db);
	const users = createDrizzleAdminUserRepository(db);

	return {
		// 管理者の入口に出す、未対応の件数。
		async summary() {
			const [openReports, openAppeals, openUserReports] = await Promise.all([
				reports.countOpen(),
				appeals.countOpen(),
				userReports.countOpen(),
			]);

			return { openReports, openAppeals, openUserReports };
		},

		// ユーザーを探す（表示名・ハンドルの一部）。
		searchUsers: (query: string) => users.search(query, adminUserSearchLimit),

		// ユーザーを停止する（永久停止を含む。管理者のアカウントは停止できない）。
		suspendUser(input: v.InferOutput<typeof suspendUserInputSchema>) {
			const adminEmails = parseAdminEmails(env.ADMIN_EMAILS);

			return users.suspend({
				...input,
				isProtectedEmail: (email) => isAdminEmail(email, adminEmails),
				hashEmail,
				now: new Date(),
			});
		},

		// 停止を解除する（永久停止も解除できる）。
		liftSuspension: (userId: string) => users.lift({ userId, hashEmail }),

		listOpenAppeals: () => appeals.listOpen(),
		listResolvedAppeals: () => appeals.listResolved(resolvedAppealHistoryLimit),

		// 申し立てへの対応（停止の解除・永久停止・退ける）。
		resolveAppeal: (input: v.InferOutput<typeof resolveAppealInputSchema>) =>
			appeals.resolve({ ...input, hashEmail, now: new Date() }),

		listOpenReports: () => reports.listOpen(),
		listResolvedReports: () => reports.listResolved(resolvedHistoryLimit),

		// 通報されたレシピの内容（持ち主として読む）。削除されていれば null。
		async getReportedRecipe(reportId: string) {
			const reported = await reports.findReportedRecipe(reportId);

			if (!reported) {
				return null;
			}

			return createDrizzleRecipeRepository(
				db,
				reported.ownerUserId,
			).getByPublicId(reported.recipePublicId);
		},

		// 通報への対応（非公開にする・削除する・却下する）。
		resolveReport: (input: v.InferOutput<typeof resolveReportInputSchema>) =>
			reports.resolve({ ...input, now: new Date() }),

		listOpenUserReports: () => userReports.listOpen(),
		listResolvedUserReports: () =>
			userReports.listResolved(resolvedHistoryLimit),

		// ユーザー名の通報への対応（名前を初期値に戻す・却下する）。
		resolveUserReport: (
			input: v.InferOutput<typeof resolveUserNameReportInputSchema>,
		) =>
			userReports.resolve({
				...input,
				generateHandle: () =>
					generateHandle((size) => {
						const [value] = crypto.getRandomValues(new Uint32Array(1));

						return (value ?? 0) % size;
					}),
				now: new Date(),
			}),
	};
}

export type AdminOperations = ReturnType<typeof createAdminOperations>;
