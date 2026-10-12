import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { notifyAdminsOf } from "#/features/admin/server/notify-admins";
import { createDrizzleReportRepository } from "#/features/reports/infrastructure/drizzle-report-repository";
import { requireSession } from "#/integrations/better-auth/require-session";
import { createReportInputSchema } from "../domain/report";

// レシピの通報。見られないレシピ、自分のレシピは、通報できない。
export const createReportServerFn = createServerFn({ method: "POST" })
	.validator((input) => v.parse(createReportInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		const result = await createDrizzleReportRepository(db).create({
			reporterUserId: userId,
			recipePublicId: data.recipePublicId,
			reason: data.reason,
			detail: data.detail,
			now: new Date(),
		});

		// 新しい通報が入ったら、管理者に知らせる（送れなくても、通報は成功のまま）。
		if (result === "created") {
			await notifyAdminsOf(db, "report");
		}

		return result;
	});
