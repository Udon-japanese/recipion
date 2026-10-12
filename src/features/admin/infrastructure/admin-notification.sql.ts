import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

// 管理者へのお知らせを、種類ごとに最後に送った時刻（続けて来ても、メールが溢れないようにするため）。
export const adminNotificationLog = pgTable("admin_notification_log", {
	kind: text("kind").primaryKey(),
	lastSentAt: timestamp("last_sent_at", { withTimezone: true }).notNull(),
});
