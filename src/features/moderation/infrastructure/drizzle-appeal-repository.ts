import { and, asc, count, eq, gte } from "drizzle-orm";

import type { DB } from "#/db/client";
import { user } from "#/integrations/better-auth/auth.sql";
import type { AppealRepository } from "../application/appeal-repository";
import {
	type AppealVerdict,
	appealVerdicts,
	type OpenAppeal,
} from "../domain/appeal";
import {
	accountSuspension,
	bannedEmail,
	suspensionAppeal,
} from "./moderation.sql";

function toVerdict(value: string): AppealVerdict {
	return appealVerdicts.find((verdict) => verdict === value) ?? "not-judged";
}

// 申し立ての保存と、管理者の対応。管理者の確認は、呼び出す側（requireAdmin）で行う。
export function createDrizzleAppealRepository(db: DB): AppealRepository {
	return {
		async getSuspension(userId) {
			const [row] = await db
				.select({ status: accountSuspension.status })
				.from(accountSuspension)
				.where(eq(accountSuspension.userId, userId))
				.limit(1);

			if (!row) {
				return null;
			}

			return row.status === "banned" ? "banned" : "suspended";
		},

		async countAppealsSince(userId, since) {
			const [row] = await db
				.select({ total: count() })
				.from(suspensionAppeal)
				.where(
					and(
						eq(suspensionAppeal.userId, userId),
						gte(suspensionAppeal.createdAt, since),
					),
				);

			return row?.total ?? 0;
		},

		async create({ userId, message, verdict, now }) {
			await db.insert(suspensionAppeal).values({
				userId,
				message,
				aiVerdict: verdict,
				createdAt: now,
			});
		},

		async listOpen() {
			const rows = await db
				.select({
					id: suspensionAppeal.id,
					userName: user.name,
					userHandle: user.handle,
					userEmail: user.email,
					message: suspensionAppeal.message,
					verdict: suspensionAppeal.aiVerdict,
					createdAt: suspensionAppeal.createdAt,
					suspendedAt: accountSuspension.suspendedAt,
					suspensionReason: accountSuspension.reason,
				})
				.from(suspensionAppeal)
				.innerJoin(user, eq(user.id, suspensionAppeal.userId))
				.leftJoin(
					accountSuspension,
					eq(accountSuspension.userId, suspensionAppeal.userId),
				)
				.where(eq(suspensionAppeal.status, "open"))
				.orderBy(asc(suspensionAppeal.createdAt));

			return rows.map(
				(row): OpenAppeal => ({
					id: row.id,
					userName: row.userName,
					userHandle: row.userHandle,
					userEmail: row.userEmail,
					message: row.message,
					verdict: toVerdict(row.verdict),
					createdAt: row.createdAt.toISOString(),
					suspendedAt: row.suspendedAt?.toISOString() ?? null,
					suspensionReason: row.suspensionReason,
				}),
			);
		},

		async resolve({ appealId, action, hashEmail, now }) {
			const [appeal] = await db
				.select({
					id: suspensionAppeal.id,
					userId: suspensionAppeal.userId,
					userEmail: user.email,
				})
				.from(suspensionAppeal)
				.innerJoin(user, eq(user.id, suspensionAppeal.userId))
				.where(
					and(
						eq(suspensionAppeal.id, appealId),
						eq(suspensionAppeal.status, "open"),
					),
				)
				.limit(1);

			if (!appeal) {
				return "not-found";
			}

			// ハッシュは、トランザクションの外で作る（暗号の処理を、中に入れない）。
			const emailHash =
				action === "ban" ? await hashEmail(appeal.userEmail) : null;

			await db.transaction(async (transaction) => {
				const resolution =
					action === "lift"
						? "lifted"
						: action === "ban"
							? "banned"
							: "rejected";

				// 同じユーザーの、未対応の申し立ては、まとめて対応済みにする（同じ結論になるため）。
				await transaction
					.update(suspensionAppeal)
					.set({ status: "resolved", resolution, resolvedAt: now })
					.where(
						and(
							eq(suspensionAppeal.userId, appeal.userId),
							eq(suspensionAppeal.status, "open"),
						),
					);

				if (action === "lift") {
					await transaction
						.delete(accountSuspension)
						.where(eq(accountSuspension.userId, appeal.userId));
				}

				if (action === "ban" && emailHash !== null) {
					await transaction
						.update(accountSuspension)
						.set({ status: "banned" })
						.where(eq(accountSuspension.userId, appeal.userId));
					await transaction
						.insert(bannedEmail)
						.values({ emailHash, bannedAt: now })
						.onConflictDoNothing();
				}
			});

			return "done";
		},
	};
}
