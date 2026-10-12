import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { notifyAdminsOf } from "#/features/admin/server/notify-admins";
import { requireSession } from "#/integrations/better-auth/require-session";
import { createUserNameReportInputSchema } from "../domain/user-report";
import { createDrizzleUserReportRepository } from "../infrastructure/drizzle-user-report-repository";

// ユーザー名（表示名・ハンドル）の通報。自分は、通報できない。
export const createUserNameReportServerFn = createServerFn({ method: "POST" })
	.validator((input) => v.parse(createUserNameReportInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		const result = await createDrizzleUserReportRepository(db).create({
			reporterUserId: userId,
			handle: data.handle,
			reason: data.reason,
			detail: data.detail,
			now: new Date(),
		});

		// 新しい通報が入ったら、管理者に知らせる（送れなくても、通報は成功のまま）。
		if (result === "created") {
			await notifyAdminsOf(db, "user-report");
		}

		return result;
	});
