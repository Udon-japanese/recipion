import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { createDrizzleReportRepository } from "#/features/reports/infrastructure/drizzle-report-repository";
import { requireAdmin } from "#/integrations/cloudflare-access/require-admin";
import { resolveReportInputSchema } from "../domain/report";

const reportIdSchema = v.object({ reportId: v.pipe(v.string(), v.uuid()) });

// 未対応の通報の一覧（管理者だけ）。
export const listOpenReportsServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db } = await requireAdmin();

	return createDrizzleReportRepository(db).listOpen();
});

// 通報されたレシピの内容（管理者だけ。持ち主として読む）。削除されていれば null。
export const getReportedRecipeServerFn = createServerFn({ method: "GET" })
	.validator((input) => v.parse(reportIdSchema, input))
	.handler(async ({ data }) => {
		const { db } = await requireAdmin();
		const reported = await createDrizzleReportRepository(db).findReportedRecipe(
			data.reportId,
		);

		if (!reported) {
			return null;
		}

		return createDrizzleRecipeRepository(
			db,
			reported.ownerUserId,
		).getByPublicId(reported.recipePublicId);
	});

// 通報への対応（非公開にする・削除する・却下する。管理者だけ）。
export const resolveReportServerFn = createServerFn({ method: "POST" })
	.validator((input) => v.parse(resolveReportInputSchema, input))
	.handler(async ({ data }) => {
		const { db } = await requireAdmin();

		return createDrizzleReportRepository(db).resolve({
			reportId: data.reportId,
			action: data.action,
			now: new Date(),
		});
	});
