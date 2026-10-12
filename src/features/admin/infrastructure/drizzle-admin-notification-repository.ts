import { eq, lt } from "drizzle-orm";

import type { DB } from "#/db/client";
import type { AdminNotificationKind } from "../domain/admin-notification";
import { adminNotificationLog } from "./admin-notification.sql";

// 種類ごとに、前回から間隔があいていれば、時刻を更新して true を返す（なければ false）。
// 同時に来た2つの通知は、条件つきの更新で、片方だけが通る。
export function createDrizzleAdminNotificationRepository(db: DB) {
	return {
		async claimSlot(
			kind: AdminNotificationKind,
			now: Date,
			intervalMs: number,
		): Promise<boolean> {
			const threshold = new Date(now.getTime() - intervalMs);
			const rows = await db
				.insert(adminNotificationLog)
				.values({ kind, lastSentAt: now })
				.onConflictDoUpdate({
					target: adminNotificationLog.kind,
					set: { lastSentAt: now },
					setWhere: lt(adminNotificationLog.lastSentAt, threshold),
				})
				.returning({ kind: adminNotificationLog.kind });

			return rows.length > 0;
		},

		// 送ったあと、失敗したときに、記録を戻す（次の通知を、止めないため）。
		async release(kind: AdminNotificationKind): Promise<void> {
			await db
				.delete(adminNotificationLog)
				.where(eq(adminNotificationLog.kind, kind));
		},
	};
}
