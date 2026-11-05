import { and, count, desc, eq, max, sql } from "drizzle-orm";
import type { DB } from "#/db/client";
import { resolveUserAvatar } from "#/features/avatar/domain/avatar-presets";
import { parseDishCover } from "#/features/dish-art/domain/dish-cover";
import { user } from "#/integrations/better-auth/auth.sql";
import {
	formatRecipeCookCursor,
	parseRecipeCookCursor,
	type RecipeCookPage,
	type RecipeCookStats,
	recipeCookPageSize,
} from "../domain/recipe-cook-log";
import { parseRecipeVisibility } from "../domain/recipe-link-permission";
import { canViewRecipe } from "./drizzle-recipe-viewer-repository";
import { recipe, recipeCookLog } from "./recipe.sql";

// 「つくった！」の記録。読み書きするのは、いつも自分（userId）の記録だけ。
export function createDrizzleRecipeCookLogRepository(db: DB, userId: string) {
	async function statsOf(recipeId: string): Promise<RecipeCookStats> {
		const [row] = await db
			.select({ count: count(), lastCookedAt: max(recipeCookLog.cookedAt) })
			.from(recipeCookLog)
			.where(
				and(
					eq(recipeCookLog.userId, userId),
					eq(recipeCookLog.recipeId, recipeId),
				),
			);

		return {
			count: row?.count ?? 0,
			lastCookedAt: row?.lastCookedAt?.toISOString() ?? null,
		};
	}

	// 見てよいレシピだけ（見てはいけない・存在しないは、どちらも null）。
	async function findViewable(publicId: string) {
		const [found] = await db
			.select({
				id: recipe.id,
				userId: recipe.userId,
				visibility: recipe.visibility,
				name: recipe.name,
			})
			.from(recipe)
			.where(eq(recipe.publicId, publicId))
			.limit(1);

		return found && (await canViewRecipe(db, userId, found)) ? found : null;
	}

	return {
		// 記録する。同じ操作の印（sourceId）で再送しても、1回だけ。見てよいレシピでなければ null。
		async record(input: {
			recipePublicId: string;
			sourceId: string;
			// つくった量（「2人分」）。
			yieldText: string;
		}): Promise<RecipeCookStats | null> {
			const found = await findViewable(input.recipePublicId);

			if (!found) {
				return null;
			}

			await db
				.insert(recipeCookLog)
				.values({
					userId,
					recipeId: found.id,
					recipeName: found.name,
					yieldText: input.yieldText,
					sourceId: input.sourceId,
				})
				.onConflictDoNothing({
					target: [recipeCookLog.userId, recipeCookLog.sourceId],
				});

			return statsOf(found.id);
		},

		// 「元に戻す」で、記録を消す（なければ、何もしない）。自分の記録なので、レシピが見られなくなっていても消す。
		// 回数と最後の日は、見てよいレシピのときだけ返す（でなければ null）。
		async cancel(input: {
			recipePublicId: string;
			sourceId: string;
		}): Promise<RecipeCookStats | null> {
			await db
				.delete(recipeCookLog)
				.where(
					and(
						eq(recipeCookLog.userId, userId),
						eq(recipeCookLog.sourceId, input.sourceId),
					),
				);

			const found = await findViewable(input.recipePublicId);

			return found ? statsOf(found.id) : null;
		},

		// レシピの画面に出す回数と最後の日。見てよいレシピでなければ null。
		async statsFor(recipePublicId: string): Promise<RecipeCookStats | null> {
			const found = await findViewable(recipePublicId);

			return found ? statsOf(found.id) : null;
		},

		// 新しい順の一覧。
		async list(cursor: string | null): Promise<RecipeCookPage> {
			const parsedCursor =
				cursor === null ? null : parseRecipeCookCursor(cursor);
			const rows = await db
				.select({
					id: recipeCookLog.id,
					cookedAt: recipeCookLog.cookedAt,
					cookedAtText: sql<string>`${recipeCookLog.cookedAt}::text`,
					snapshotName: recipeCookLog.recipeName,
					recipeUserId: recipe.userId,
					visibility: recipe.visibility,
					publicId: recipe.publicId,
					name: recipe.name,
					cover: recipe.cover,
					yieldText: recipeCookLog.yieldText,
					authorName: user.name,
					authorHandle: user.handle,
					authorAvatar: user.avatar,
				})
				.from(recipeCookLog)
				.leftJoin(recipe, eq(recipe.id, recipeCookLog.recipeId))
				.leftJoin(user, eq(user.id, recipe.userId))
				.where(
					and(
						eq(recipeCookLog.userId, userId),
						parsedCursor
							? sql`(${recipeCookLog.cookedAt}, ${recipeCookLog.id}) < (${parsedCursor.cookedAt}::timestamptz, ${parsedCursor.id}::uuid)`
							: undefined,
					),
				)
				.orderBy(desc(recipeCookLog.cookedAt), desc(recipeCookLog.id))
				.limit(recipeCookPageSize + 1);

			const pageRows = rows.slice(0, recipeCookPageSize);
			const last = pageRows.at(-1);

			return {
				entries: pageRows.map((row) => {
					// 自分のレシピと、非公開でない他の人のレシピは、開ける（限定公開は、開けなければパスフレーズの画面になる）。
					const canOpen =
						row.publicId !== null &&
						row.visibility !== null &&
						(row.recipeUserId === userId ||
							parseRecipeVisibility(row.visibility) !== "private");

					return {
						id: row.id,
						cookedAt: row.cookedAt.toISOString(),
						recipeName: canOpen && row.name ? row.name : row.snapshotName,
						publicId: canOpen ? row.publicId : null,
						cover: canOpen ? parseDishCover(row.cover) : null,
						yieldText: row.yieldText,
						author:
							canOpen &&
							row.recipeUserId !== null &&
							row.recipeUserId !== userId &&
							row.authorName !== null &&
							row.authorHandle !== null
								? {
										name: row.authorName,
										handle: row.authorHandle,
										avatar: resolveUserAvatar(
											row.recipeUserId,
											row.authorAvatar,
										),
									}
								: null,
					};
				}),
				nextCursor:
					rows.length > recipeCookPageSize && last
						? formatRecipeCookCursor({
								cookedAt: last.cookedAtText,
								id: last.id,
							})
						: null,
			};
		},
	};
}
