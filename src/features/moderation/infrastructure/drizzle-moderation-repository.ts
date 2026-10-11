import { and, count, eq, gte } from "drizzle-orm";

import type { DB } from "#/db/client";
import type {
	CachedDecision,
	ModerationRepository,
} from "../application/moderation-repository";
import type { ModerationReason } from "../domain/moderation-result";
import {
	accountSuspension,
	moderationCache,
	moderationViolation,
} from "./moderation.sql";

function toCachedDecision(
	decision: string,
	reasons: unknown,
): CachedDecision | null {
	if (decision !== "allow" && decision !== "flag" && decision !== "block") {
		return null;
	}

	return {
		decision,
		reasons: Array.isArray(reasons) ? (reasons as ModerationReason[]) : [],
	};
}

export function createDrizzleModerationRepository(
	db: DB,
): ModerationRepository {
	return {
		async getSuspension(userId) {
			const [row] = await db
				.select({ status: accountSuspension.status })
				.from(accountSuspension)
				.where(eq(accountSuspension.userId, userId))
				.limit(1);

			return row?.status === "banned" ? "banned" : row ? "suspended" : null;
		},

		async suspend({ userId, reason, now }) {
			await db
				.insert(accountSuspension)
				.values({ userId, status: "suspended", reason, suspendedAt: now })
				// すでに停止（永久停止を含む）なら、状態は変えない。
				.onConflictDoNothing();
		},

		async listViolationTimes(userId, since) {
			const rows = await db
				.select({ createdAt: moderationViolation.createdAt })
				.from(moderationViolation)
				.where(
					and(
						eq(moderationViolation.userId, userId),
						gte(moderationViolation.createdAt, since),
					),
				);

			return rows.map((row) => row.createdAt);
		},

		async recordViolation({ userId, now, categories }) {
			await db.insert(moderationViolation).values({
				userId,
				categories: [...new Set(categories)],
				createdAt: now,
			});
		},

		async getCached(contentHash) {
			const [row] = await db
				.select({
					decision: moderationCache.decision,
					reasons: moderationCache.reasons,
				})
				.from(moderationCache)
				.where(eq(moderationCache.contentHash, contentHash))
				.limit(1);

			return row ? toCachedDecision(row.decision, row.reasons) : null;
		},

		async putCached({ contentHash, userId, decision, now }) {
			await db
				.insert(moderationCache)
				.values({
					contentHash,
					userId,
					decision: decision.decision,
					reasons: decision.reasons,
					createdAt: now,
				})
				.onConflictDoNothing();
		},

		async countAiChecksSince(userId, since) {
			const [row] = await db
				.select({ total: count() })
				.from(moderationCache)
				.where(
					and(
						eq(moderationCache.userId, userId),
						gte(moderationCache.createdAt, since),
					),
				);

			return row?.total ?? 0;
		},
	};
}
