import { and, asc, count, desc, eq, gte, sql } from "drizzle-orm";

import type { DB } from "#/db/client";
import { parseRecipeVisibility } from "#/features/recipes/domain/recipe-link-permission";
import { recipe } from "#/features/recipes/infrastructure/recipe.sql";
import { user } from "#/integrations/better-auth/auth.sql";

import type { ReportRepository } from "../application/report-repository";
import {
	maxReportsPerDay,
	type OpenReport,
	type ReportReason,
	type ReportResolution,
	type ResolvedReport,
	reportReasons,
} from "../domain/report";
import { recipeReport } from "./report.sql";

type PostgresError = { code?: unknown; constraint?: unknown; cause?: unknown };

// 一意制約への違反か（Drizzle は、元のエラーを cause に入れることがある）。
function isUniqueViolation(error: unknown, constraint: string): boolean {
	for (
		let current: unknown = error;
		typeof current === "object" && current !== null;
		current = (current as PostgresError).cause
	) {
		const { code, constraint: name } = current as PostgresError;

		if (code === "23505" && name === constraint) {
			return true;
		}
	}

	return false;
}

function toReportReason(value: string): ReportReason {
	return reportReasons.find((reason) => reason === value) ?? "other";
}

function toReportResolution(value: string | null): ReportResolution {
	return value === "made-private" || value === "deleted" ? value : "dismissed";
}

const oneDayMs = 24 * 60 * 60 * 1000;

// 通報の保存と、管理者の対応。管理者の確認は、呼び出す側（requireAdmin）で行う。
export function createDrizzleReportRepository(db: DB): ReportRepository {
	return {
		async create(input) {
			const [target] = await db
				.select({
					id: recipe.id,
					name: recipe.name,
					ownerUserId: recipe.userId,
					visibility: recipe.visibility,
				})
				.from(recipe)
				.where(eq(recipe.publicId, input.recipePublicId))
				.limit(1);

			if (!target) {
				return "not-found";
			}

			if (target.ownerUserId === input.reporterUserId) {
				return "own-recipe";
			}

			// 通報できるのは、通報する人に、見えるレシピだけ（非公開は、見えない）。
			if (parseRecipeVisibility(target.visibility) === "private") {
				return "not-found";
			}

			const [existing] = await db
				.select({ id: recipeReport.id })
				.from(recipeReport)
				.where(
					and(
						eq(recipeReport.recipeId, target.id),
						eq(recipeReport.reporterUserId, input.reporterUserId),
						eq(recipeReport.status, "open"),
					),
				)
				.limit(1);

			if (existing) {
				return "duplicate";
			}

			const [recent] = await db
				.select({ total: count() })
				.from(recipeReport)
				.where(
					and(
						eq(recipeReport.reporterUserId, input.reporterUserId),
						gte(
							recipeReport.createdAt,
							new Date(input.now.getTime() - oneDayMs),
						),
					),
				);

			if ((recent?.total ?? 0) >= maxReportsPerDay) {
				return "limit";
			}

			try {
				await db.insert(recipeReport).values({
					recipeId: target.id,
					recipePublicId: input.recipePublicId,
					recipeName: target.name,
					reporterUserId: input.reporterUserId,
					reason: input.reason,
					detail: input.detail,
					createdAt: input.now,
				});
			} catch (error) {
				// 同時に、重ねて通報されたときは、一意制約が止める。
				if (isUniqueViolation(error, "recipe_report_open_unique")) {
					return "duplicate";
				}

				throw error;
			}

			return "created";
		},

		async createAutoDetected({ recipePublicId, detail, now }) {
			const [target] = await db
				.select({ id: recipe.id, name: recipe.name })
				.from(recipe)
				.where(eq(recipe.publicId, recipePublicId))
				.limit(1);

			if (!target) {
				return "not-found";
			}

			// 未対応の自動検知が、すでにあるときは、何もしない（部分一意索引に当たったら、無視する）。
			const inserted = await db
				.insert(recipeReport)
				.values({
					recipeId: target.id,
					recipePublicId,
					recipeName: target.name,
					reporterUserId: null,
					reason: "auto-detected",
					detail: detail.slice(0, 1000),
					createdAt: now,
				})
				.onConflictDoNothing({
					target: recipeReport.recipeId,
					where: sql`${recipeReport.reason} = 'auto-detected' AND ${recipeReport.status} = 'open'`,
				})
				.returning({ id: recipeReport.id });

			return inserted.length > 0 ? "created" : "exists";
		},

		async listOpen() {
			const rows = await db
				.select({
					id: recipeReport.id,
					recipePublicId: recipeReport.recipePublicId,
					reportedName: recipeReport.recipeName,
					currentName: recipe.name,
					recipeId: recipe.id,
					ownerName: user.name,
					ownerHandle: user.handle,
					reason: recipeReport.reason,
					detail: recipeReport.detail,
					createdAt: recipeReport.createdAt,
				})
				.from(recipeReport)
				.leftJoin(recipe, eq(recipe.id, recipeReport.recipeId))
				.leftJoin(user, eq(user.id, recipe.userId))
				.where(eq(recipeReport.status, "open"))
				.orderBy(asc(recipeReport.createdAt));

			return rows.map(
				(row): OpenReport => ({
					id: row.id,
					recipePublicId: row.recipePublicId,
					recipeName: row.currentName ?? row.reportedName,
					recipeExists: row.recipeId !== null,
					ownerName: row.ownerName,
					ownerHandle: row.ownerHandle,
					reason: toReportReason(row.reason),
					detail: row.detail,
					createdAt: row.createdAt.toISOString(),
				}),
			);
		},

		async listResolved(limit) {
			const rows = await db
				.select({
					id: recipeReport.id,
					recipePublicId: recipeReport.recipePublicId,
					reportedName: recipeReport.recipeName,
					currentName: recipe.name,
					ownerName: user.name,
					ownerHandle: user.handle,
					reason: recipeReport.reason,
					detail: recipeReport.detail,
					resolution: recipeReport.resolution,
					createdAt: recipeReport.createdAt,
					resolvedAt: recipeReport.resolvedAt,
				})
				.from(recipeReport)
				.leftJoin(recipe, eq(recipe.id, recipeReport.recipeId))
				.leftJoin(user, eq(user.id, recipe.userId))
				.where(eq(recipeReport.status, "resolved"))
				.orderBy(desc(recipeReport.resolvedAt))
				.limit(limit);

			return rows.map(
				(row): ResolvedReport => ({
					id: row.id,
					recipePublicId: row.recipePublicId,
					recipeName: row.currentName ?? row.reportedName,
					ownerName: row.ownerName,
					ownerHandle: row.ownerHandle,
					reason: toReportReason(row.reason),
					detail: row.detail,
					resolution: toReportResolution(row.resolution),
					createdAt: row.createdAt.toISOString(),
					resolvedAt: (row.resolvedAt ?? row.createdAt).toISOString(),
				}),
			);
		},

		async countOpen() {
			const [row] = await db
				.select({ total: count() })
				.from(recipeReport)
				.where(eq(recipeReport.status, "open"));

			return row?.total ?? 0;
		},

		async findReportedRecipe(reportId) {
			const [row] = await db
				.select({
					recipePublicId: recipeReport.recipePublicId,
					ownerUserId: recipe.userId,
				})
				.from(recipeReport)
				.innerJoin(recipe, eq(recipe.id, recipeReport.recipeId))
				.where(eq(recipeReport.id, reportId))
				.limit(1);

			return row ?? null;
		},

		async resolve({ reportId, action, now }) {
			return db.transaction(async (transaction) => {
				const [report] = await transaction
					.select({
						id: recipeReport.id,
						recipeId: recipeReport.recipeId,
					})
					.from(recipeReport)
					.where(
						and(eq(recipeReport.id, reportId), eq(recipeReport.status, "open")),
					)
					.limit(1);

				if (!report) {
					return "not-found";
				}

				if (action === "dismiss") {
					await transaction
						.update(recipeReport)
						.set({
							status: "resolved",
							resolution: "dismissed",
							resolvedAt: now,
						})
						.where(eq(recipeReport.id, report.id));

					return "done";
				}

				const resolution = action === "delete" ? "deleted" : "made-private";

				// 同じレシピへの、未対応の通報は、まとめて対応済みにする。
				await transaction
					.update(recipeReport)
					.set({ status: "resolved", resolution, resolvedAt: now })
					.where(
						report.recipeId === null
							? eq(recipeReport.id, report.id)
							: and(
									eq(recipeReport.recipeId, report.recipeId),
									eq(recipeReport.status, "open"),
								),
					);

				if (report.recipeId !== null) {
					if (action === "delete") {
						await transaction
							.delete(recipe)
							.where(eq(recipe.id, report.recipeId));
					} else {
						await transaction
							.update(recipe)
							.set({ visibility: "private" })
							.where(eq(recipe.id, report.recipeId));
					}
				}

				return "done";
			});
		},
	};
}
