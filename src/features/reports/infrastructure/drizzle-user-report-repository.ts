import { and, asc, count, desc, eq, gte } from "drizzle-orm";
import type { DB } from "#/db/client";
import { isUniqueViolation } from "#/db/is-unique-violation";
import { defaultDisplayName } from "#/features/profile/domain/profile";
import { user } from "#/integrations/better-auth/auth.sql";

import type { UserReportRepository } from "../application/user-report-repository";
import {
	maxUserNameReportsPerDay,
	type OpenUserNameReport,
	type ResolvedUserNameReport,
	type UserNameReportReason,
	type UserNameReportResolution,
	userNameReportReasons,
} from "../domain/user-report";
import { userReport } from "./user-report.sql";

const oneDayMs = 24 * 60 * 60 * 1000;

// 名前を戻すとき、新しいハンドルが他と重なったら、作り直す回数の上限。
const maxHandleAttempts = 5;

function toReason(value: string): UserNameReportReason {
	return userNameReportReasons.find((reason) => reason === value) ?? "other";
}

function toResolution(value: string | null): UserNameReportResolution {
	return value === "name-reset" || value === "suspended" ? value : "dismissed";
}

// ユーザー名への通報の保存と、管理者の対応。管理者の確認は、呼び出す側（requireAdmin）で行う。
export function createDrizzleUserReportRepository(
	db: DB,
): UserReportRepository {
	const selection = {
		id: userReport.id,
		reportedName: userReport.reportedName,
		reportedHandle: userReport.reportedHandle,
		currentName: user.name,
		currentHandle: user.handle,
		reason: userReport.reason,
		detail: userReport.detail,
		resolution: userReport.resolution,
		createdAt: userReport.createdAt,
		resolvedAt: userReport.resolvedAt,
	};

	return {
		async create(input) {
			const [target] = await db
				.select({ id: user.id, name: user.name, handle: user.handle })
				.from(user)
				.where(eq(user.handle, input.handle.replace(/^@/u, "")))
				.limit(1);

			if (!target) {
				return "not-found";
			}

			if (target.id === input.reporterUserId) {
				return "own-profile";
			}

			const [existing] = await db
				.select({ id: userReport.id })
				.from(userReport)
				.where(
					and(
						eq(userReport.reportedUserId, target.id),
						eq(userReport.reporterUserId, input.reporterUserId),
						eq(userReport.status, "open"),
					),
				)
				.limit(1);

			if (existing) {
				return "duplicate";
			}

			const [recent] = await db
				.select({ total: count() })
				.from(userReport)
				.where(
					and(
						eq(userReport.reporterUserId, input.reporterUserId),
						gte(userReport.createdAt, new Date(input.now.getTime() - oneDayMs)),
					),
				);

			if ((recent?.total ?? 0) >= maxUserNameReportsPerDay) {
				return "limit";
			}

			try {
				await db.insert(userReport).values({
					reportedUserId: target.id,
					reportedName: target.name,
					reportedHandle: target.handle,
					reporterUserId: input.reporterUserId,
					reason: input.reason,
					detail: input.detail,
					createdAt: input.now,
				});
			} catch (error) {
				// 同時に、重ねて通報されたときは、一意制約が止める。
				if (isUniqueViolation(error, "user_report_open_unique")) {
					return "duplicate";
				}

				throw error;
			}

			return "created";
		},

		async listOpen() {
			const rows = await db
				.select(selection)
				.from(userReport)
				.leftJoin(user, eq(user.id, userReport.reportedUserId))
				.where(eq(userReport.status, "open"))
				.orderBy(asc(userReport.createdAt));

			return rows.map(
				(row): OpenUserNameReport => ({
					id: row.id,
					reportedName: row.reportedName,
					reportedHandle: row.reportedHandle,
					currentName: row.currentName,
					currentHandle: row.currentHandle,
					reason: toReason(row.reason),
					detail: row.detail,
					createdAt: row.createdAt.toISOString(),
				}),
			);
		},

		async listResolved(limit) {
			const rows = await db
				.select(selection)
				.from(userReport)
				.leftJoin(user, eq(user.id, userReport.reportedUserId))
				.where(eq(userReport.status, "resolved"))
				.orderBy(desc(userReport.resolvedAt))
				.limit(limit);

			return rows.map(
				(row): ResolvedUserNameReport => ({
					id: row.id,
					reportedName: row.reportedName,
					reportedHandle: row.reportedHandle,
					currentName: row.currentName,
					currentHandle: row.currentHandle,
					reason: toReason(row.reason),
					detail: row.detail,
					createdAt: row.createdAt.toISOString(),
					resolution: toResolution(row.resolution),
					resolvedAt: (row.resolvedAt ?? row.createdAt).toISOString(),
				}),
			);
		},

		async countOpen() {
			const [row] = await db
				.select({ total: count() })
				.from(userReport)
				.where(eq(userReport.status, "open"));

			return row?.total ?? 0;
		},

		async resolve({ reportId, action, generateHandle, now }) {
			return db.transaction(async (transaction) => {
				const [report] = await transaction
					.select({
						id: userReport.id,
						reportedUserId: userReport.reportedUserId,
					})
					.from(userReport)
					.where(
						and(eq(userReport.id, reportId), eq(userReport.status, "open")),
					)
					.limit(1);

				if (!report) {
					return "not-found";
				}

				if (action === "dismiss") {
					await transaction
						.update(userReport)
						.set({
							status: "resolved",
							resolution: "dismissed",
							resolvedAt: now,
						})
						.where(eq(userReport.id, report.id));

					return "done";
				}

				const reportedUserId = report.reportedUserId;

				if (reportedUserId !== null) {
					let isReset = false;

					for (let attempt = 0; attempt < maxHandleAttempts; attempt += 1) {
						try {
							// 失敗しても、全体を巻き込まないよう、セーブポイントの中で行う。
							await transaction.transaction(async (inner) => {
								await inner
									.update(user)
									.set({ name: defaultDisplayName, handle: generateHandle() })
									.where(eq(user.id, reportedUserId));
							});
							isReset = true;
							break;
						} catch (error) {
							if (!isUniqueViolation(error, "user_handle_unique")) {
								throw error;
							}
						}
					}

					if (!isReset) {
						throw new Error("新しいハンドルを作れませんでした");
					}
				}

				// 同じユーザーへの、未対応の通報は、まとめて対応済みにする（同じ結論になるため）。
				await transaction
					.update(userReport)
					.set({
						status: "resolved",
						resolution: "name-reset",
						resolvedAt: now,
					})
					.where(
						and(
							reportedUserId === null
								? eq(userReport.id, report.id)
								: eq(userReport.reportedUserId, reportedUserId),
							eq(userReport.status, "open"),
						),
					);

				return "done";
			});
		},
	};
}
