import { sql } from "drizzle-orm";
import {
	check,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "#/integrations/better-auth/auth.sql";

// AI を使った判定の結果（同じ内容を、再び判定しないため）。文章そのものは保存しない（ハッシュだけ）。
// user_id と created_at は、1人が1日に AI を使った回数の上限に使う。
export const moderationCache = pgTable(
	"moderation_cache",
	{
		contentHash: text("content_hash").primaryKey(),
		decision: text("decision").notNull(),
		reasons: jsonb("reasons").notNull(),
		userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		check(
			"moderation_cache_decision_valid",
			sql`${table.decision} IN ('allow', 'flag', 'block')`,
		),
		index("moderation_cache_user_created_idx").on(
			table.userId,
			table.createdAt,
		),
	],
);

// 公開できない内容を、公開しようとした記録（文章そのものは保存しない）。
export const moderationViolation = pgTable(
	"moderation_violation",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		categories: jsonb("categories").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("moderation_violation_user_created_idx").on(
			table.userId,
			table.createdAt,
		),
	],
);

// アカウントの停止。suspended: 申し立てができる / banned: 永久停止。
export const accountSuspension = pgTable(
	"account_suspension",
	{
		userId: text("user_id")
			.primaryKey()
			.references(() => user.id, { onDelete: "cascade" }),
		status: text("status").notNull(),
		reason: text("reason").notNull(),
		suspendedAt: timestamp("suspended_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		check(
			"account_suspension_status_valid",
			sql`${table.status} IN ('suspended', 'banned')`,
		),
	],
);

// 停止への申し立て。何度でも出せる。
export const suspensionAppeal = pgTable(
	"suspension_appeal",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		message: text("message").notNull(),
		aiVerdict: text("ai_verdict").notNull(),
		status: text("status").default("open").notNull(),
		resolution: text("resolution"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
	},
	(table) => [
		check(
			"suspension_appeal_message_length",
			sql`char_length(${table.message}) BETWEEN 1 AND 1000`,
		),
		check(
			"suspension_appeal_verdict_valid",
			sql`${table.aiVerdict} IN ('legitimate', 'not-legitimate', 'unsure', 'not-judged')`,
		),
		check(
			"suspension_appeal_resolution_valid",
			sql`(${table.status} = 'open' AND ${table.resolution} IS NULL AND ${table.resolvedAt} IS NULL) OR (${table.status} = 'resolved' AND ${table.resolution} IN ('lifted', 'banned', 'rejected') AND ${table.resolvedAt} IS NOT NULL)`,
		),
		index("suspension_appeal_status_created_idx").on(
			table.status,
			table.createdAt,
		),
		index("suspension_appeal_user_created_idx").on(
			table.userId,
			table.createdAt,
		),
	],
);

// 永久停止されたメールアドレス（そろえたうえで、秘密の値を混ぜたハッシュ。メールアドレスそのものは保存しない）。
export const bannedEmail = pgTable("banned_email", {
	emailHash: text("email_hash").primaryKey(),
	bannedAt: timestamp("banned_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
