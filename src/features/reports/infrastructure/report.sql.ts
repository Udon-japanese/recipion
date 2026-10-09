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

import { recipe } from "#/features/recipes/infrastructure/recipe.sql";
import { user } from "#/integrations/better-auth/auth.sql";

// レシピの通報。レシピやユーザーが消えても、通報の記録は残す（レシピの名前と公開 ID は、通報したときの控え）。
export const recipeReport = pgTable(
	"recipe_report",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		recipeId: uuid("recipe_id").references(() => recipe.id, {
			onDelete: "set null",
		}),
		recipePublicId: text("recipe_public_id").notNull(),
		recipeName: text("recipe_name").notNull(),
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
			"recipe_report_reason_valid",
			sql`${table.reason} IN ('copyright', 'inappropriate', 'other')`,
		),
		check(
			"recipe_report_detail_length",
			sql`char_length(${table.detail}) <= 1000`,
		),
		check(
			"recipe_report_resolution_valid",
			sql`(${table.status} = 'open' AND ${table.resolution} IS NULL AND ${table.resolvedAt} IS NULL) OR (${table.status} = 'resolved' AND ${table.resolution} IN ('made-private', 'deleted', 'dismissed') AND ${table.resolvedAt} IS NOT NULL)`,
		),
		// 同じユーザーが、同じレシピを、未対応のまま、重ねて通報できない。
		uniqueIndex("recipe_report_open_unique")
			.on(table.recipeId, table.reporterUserId)
			.where(sql`${table.status} = 'open'`),
		index("recipe_report_status_created_idx").on(table.status, table.createdAt),
		index("recipe_report_reporter_created_idx").on(
			table.reporterUserId,
			table.createdAt,
		),
	],
);
