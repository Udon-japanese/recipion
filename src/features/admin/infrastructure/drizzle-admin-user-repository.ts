import { desc, eq, ilike, or, sql } from "drizzle-orm";

import type { DB } from "#/db/client";
import {
	accountSuspension,
	bannedEmail,
	moderationViolation,
} from "#/features/moderation/infrastructure/moderation.sql";
import { recipe } from "#/features/recipes/infrastructure/recipe.sql";
import { recipeReport } from "#/features/reports/infrastructure/report.sql";
import { user } from "#/integrations/better-auth/auth.sql";
import type { AdminUserRepository } from "../application/admin-user-repository";
import type { AdminUserSummary } from "../domain/admin-user";

// LIKE の記号（% _ \）を、文字として扱う。
function escapeLike(value: string): string {
	return value.replace(/[\\%_]/gu, (character) => `\\${character}`);
}

// 管理者の操作。管理者の確認は、呼び出す側（requireAdmin）で行う。
export function createDrizzleAdminUserRepository(db: DB): AdminUserRepository {
	return {
		async search(query, limit) {
			const pattern = `%${escapeLike(query.replace(/^@/u, ""))}%`;

			const rows = await db
				.select({
					id: user.id,
					name: user.name,
					handle: user.handle,
					createdAt: user.createdAt,
					publicRecipeCount: sql<number>`(select count(*)::int from ${recipe} where ${recipe.userId} = ${user.id} and ${recipe.visibility} <> 'private')`,
					violationCount: sql<number>`(select count(*)::int from ${moderationViolation} where ${moderationViolation.userId} = ${user.id})`,
					reportedCount: sql<number>`(select count(*)::int from ${recipeReport} inner join ${recipe} on ${recipe.id} = ${recipeReport.recipeId} where ${recipe.userId} = ${user.id})`,
					suspensionStatus: accountSuspension.status,
					suspensionReason: accountSuspension.reason,
					suspendedAt: accountSuspension.suspendedAt,
				})
				.from(user)
				.leftJoin(accountSuspension, eq(accountSuspension.userId, user.id))
				.where(
					query === ""
						? undefined
						: or(ilike(user.handle, pattern), ilike(user.name, pattern)),
				)
				.orderBy(desc(user.createdAt))
				.limit(limit);

			return rows.map(
				(row): AdminUserSummary => ({
					id: row.id,
					name: row.name,
					handle: row.handle,
					createdAt: row.createdAt.toISOString(),
					publicRecipeCount: row.publicRecipeCount,
					violationCount: row.violationCount,
					reportedCount: row.reportedCount,
					suspension:
						row.suspensionStatus && row.suspendedAt
							? {
									status:
										row.suspensionStatus === "banned" ? "banned" : "suspended",
									reason: row.suspensionReason ?? "",
									suspendedAt: row.suspendedAt.toISOString(),
								}
							: null,
				}),
			);
		},

		async suspend({
			userId,
			reason,
			ban,
			makePrivate,
			isProtectedEmail,
			hashEmail,
			now,
		}) {
			const [target] = await db
				.select({ id: user.id, email: user.email })
				.from(user)
				.where(eq(user.id, userId))
				.limit(1);

			if (!target) {
				return "not-found";
			}

			if (isProtectedEmail(target.email)) {
				return "protected";
			}

			// ハッシュは、トランザクションの外で作る（暗号の処理を、中に入れない）。
			const emailHash = ban ? await hashEmail(target.email) : null;
			const status = ban ? "banned" : "suspended";

			await db.transaction(async (transaction) => {
				// すでに停止中なら、状態と理由を、新しい操作で置き換える（停止→永久停止への切り替えなど）。
				await transaction
					.insert(accountSuspension)
					.values({ userId, status, reason, suspendedAt: now })
					.onConflictDoUpdate({
						target: accountSuspension.userId,
						set: { status, reason, suspendedAt: now },
					});

				if (emailHash !== null) {
					await transaction
						.insert(bannedEmail)
						.values({ emailHash, bannedAt: now })
						.onConflictDoNothing();
				}

				if (makePrivate) {
					// 限定公開のパスフレーズは、非公開では持たない（制約）。
					await transaction
						.update(recipe)
						.set({ visibility: "private", unlistedPassphrase: null })
						.where(
							sql`${recipe.userId} = ${userId} and ${recipe.visibility} <> 'private'`,
						);
				}
			});

			return "done";
		},

		async lift({ userId, hashEmail }) {
			const [target] = await db
				.select({
					status: accountSuspension.status,
					email: user.email,
				})
				.from(accountSuspension)
				.innerJoin(user, eq(user.id, accountSuspension.userId))
				.where(eq(accountSuspension.userId, userId))
				.limit(1);

			if (!target) {
				return "not-suspended";
			}

			const emailHash =
				target.status === "banned" ? await hashEmail(target.email) : null;

			await db.transaction(async (transaction) => {
				await transaction
					.delete(accountSuspension)
					.where(eq(accountSuspension.userId, userId));

				if (emailHash !== null) {
					await transaction
						.delete(bannedEmail)
						.where(eq(bannedEmail.emailHash, emailHash));
				}
			});

			return "done";
		},
	};
}
