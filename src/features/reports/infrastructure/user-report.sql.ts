import { sql } from "drizzle-orm";
import {
	check,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "#/integrations/better-auth/auth.sql";

// ユーザー名（表示名・ハンドル）への通報。ユーザーが消えても、記録は残す（名前とハンドルは、通報したときの控え）。
export const userReport = pgTable(
	"user_report",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		reportedUserId: text("reported_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		reportedName: text("reported_name").notNull(),
		reportedHandle: text("reported_handle").notNull(),
		reporterUserId: text("reporter_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		reason: text("reason").notNull(),
		detail: text("detail").default("").notNull(),
		// open: 未対応 / resolved: 対応済み（resolution に、対応の内容）
		status: text("status").default("open").notNull(),
		resolution: text("resolution"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
	},
	(table) => [
		check(
			"user_report_reason_valid",
			sql`${table.reason} IN ('inappropriate', 'impersonation', 'other')`,
		),
		check(
			"user_report_detail_length",
			sql`char_length(${table.detail}) <= 1000`,
		),
		check(
			"user_report_resolution_valid",
			sql`(${table.status} = 'open' AND ${table.resolution} IS NULL AND ${table.resolvedAt} IS NULL) OR (${table.status} = 'resolved' AND ${table.resolution} IN ('name-reset', 'suspended', 'dismissed') AND ${table.resolvedAt} IS NOT NULL)`,
		),
		// 同じユーザーが、同じユーザーを、未対応のまま、重ねて通報できない。
		uniqueIndex("user_report_open_unique")
			.on(table.reportedUserId, table.reporterUserId)
			.where(sql`${table.status} = 'open'`),
		index("user_report_status_created_idx").on(table.status, table.createdAt),
		index("user_report_reporter_created_idx").on(
			table.reporterUserId,
			table.createdAt,
		),
	],
);
