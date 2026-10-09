import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { createDrizzleReportRepository } from "#/features/reports/infrastructure/drizzle-report-repository";
import { requireSession } from "#/integrations/better-auth/require-session";
import { createReportInputSchema } from "../domain/report";

// レシピの通報。見られないレシピ、自分のレシピは、通報できない。
export const createReportServerFn = createServerFn({ method: "POST" })
	.validator((input) => v.parse(createReportInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleReportRepository(db).create({
			reporterUserId: userId,
			recipePublicId: data.recipePublicId,
			reason: data.reason,
			detail: data.detail,
			now: new Date(),
		});
	});
