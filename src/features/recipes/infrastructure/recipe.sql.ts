import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	primaryKey,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "#/integrations/better-auth/auth.sql";

export const recipe = pgTable(
	"recipe",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		// URL など外部に出す ID。内部の参照には id（UUID）を使う。
		publicId: text("public_id").notNull(),
		name: text("name").notNull(),
		servings: numeric("servings", {
			precision: 10,
			scale: 3,
		}).notNull(),
		note: text("note").default("").notNull(),
		// 引用元の URL（任意）。
		sourceUrl: text("source_url"),
		// 公開範囲：private（自分だけ。既定）／unlisted（パスワードを知っている人）／public（全体公開）。
		visibility: text("visibility").default("private").notNull(),
		// 限定公開のパスフレーズ（暗号化したもの。作者が、画面でいつでも確認できるように、ハッシュではなく暗号化して保存する）。限定公開のときだけ入る。
		unlistedPassphrase: text("unlisted_passphrase"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		unique("recipe_id_user_id_unique").on(table.id, table.userId),
		unique("recipe_public_id_unique").on(table.publicId),
		check("recipe_public_id_nonempty", sql`length(${table.publicId}) > 0`),
		check(
			"recipe_source_url_http",
			sql`${table.sourceUrl} IS NULL OR ${table.sourceUrl} ~* '^https?://'`,
		),
		check(
			"recipe_visibility_valid",
			sql`${table.visibility} IN ('private', 'unlisted', 'public')`,
		),
		// 他のサイトの転載を避ける目安：引用元の URL があるレシピは、公開できない。
		check(
			"recipe_public_has_no_source_url",
			sql`${table.visibility} = 'private' OR ${table.sourceUrl} IS NULL`,
		),
		check(
			"recipe_unlisted_has_passphrase",
			sql`(${table.visibility} = 'unlisted') = (${table.unlistedPassphrase} IS NOT NULL)`,
		),
		index("recipe_user_id_idx").on(table.userId),
		check("recipe_name_nonempty", sql`length(trim(${table.name})) > 0`),
		check("recipe_servings_positive", sql`${table.servings} > 0`),
	],
);

export const recipeIngredientNode = pgTable(
	"recipe_ingredient_node",
	{
		id: uuid("id").primaryKey(),
		recipeId: uuid("recipe_id").notNull(),
		userId: text("user_id").notNull(),
		parentId: uuid("parent_id"),
		sortOrder: integer("sort_order").notNull(),
		type: text("type").notNull(),
		name: text("name").notNull(),
		rawText: text("raw_text").notNull(),
		inferred: boolean("inferred"),
		status: text("status"),
		amountText: text("amount_text"),
		quantity: numeric("quantity", {
			precision: 18,
			scale: 6,
		}),
		unitLabel: text("unit_label"),
	},
	(table) => [
		foreignKey({
			name: "recipe_ingredient_recipe_owner_fk",
			columns: [table.recipeId, table.userId],
			foreignColumns: [recipe.id, recipe.userId],
		}).onDelete("cascade"),
		unique("recipe_ingredient_id_recipe_id_unique").on(
			table.id,
			table.recipeId,
		),
		foreignKey({
			name: "recipe_ingredient_parent_same_recipe_fk",
			columns: [table.parentId, table.recipeId],
			foreignColumns: [table.id, table.recipeId],
		}),
		index("recipe_ingredient_recipe_order_idx").on(
			table.recipeId,
			table.sortOrder,
		),
		index("recipe_ingredient_parent_order_idx").on(
			table.parentId,
			table.sortOrder,
		),
		check(
			"recipe_ingredient_sort_order_nonnegative",
			sql`${table.sortOrder} >= 0`,
		),
		check(
			"recipe_ingredient_name_nonempty",
			sql`length(trim(${table.name})) > 0`,
		),
		check(
			"recipe_ingredient_shape_valid",
			sql`((
				${table.type} = 'group'
				AND ${table.inferred} IS NOT NULL
				AND ${table.status} IS NULL
				AND ${table.amountText} IS NULL
				AND ${table.quantity} IS NULL
				AND ${table.unitLabel} IS NULL
			) OR (
				${table.type} = 'ingredient'
				AND ${table.inferred} IS NULL
				AND (
					${table.status} = 'parsed'
					AND ${table.amountText} IS NOT NULL
					AND (${table.quantity} IS NULL OR ${table.quantity} > 0)
					OR
					${table.status} = 'missing-amount'
					AND ${table.amountText} IS NULL
					AND ${table.quantity} IS NULL
					AND ${table.unitLabel} IS NULL
				))
		) IS TRUE`,
		),
	],
);

export const recipePreparation = pgTable(
	"recipe_preparation",
	{
		id: uuid("id").primaryKey(),
		recipeId: uuid("recipe_id").notNull(),
		userId: text("user_id").notNull(),
		sortOrder: integer("sort_order").notNull(),
		text: text("text").notNull(),
	},
	(table) => [
		foreignKey({
			name: "recipe_preparation_recipe_owner_fk",
			columns: [table.recipeId, table.userId],
			foreignColumns: [recipe.id, recipe.userId],
		}).onDelete("cascade"),
		index("recipe_preparation_recipe_order_idx").on(
			table.recipeId,
			table.sortOrder,
		),
		check(
			"recipe_preparation_sort_order_nonnegative",
			sql`${table.sortOrder} >= 0`,
		),
		check(
			"recipe_preparation_text_nonempty",
			sql`length(trim(${table.text})) > 0`,
		),
	],
);

export const recipeInstruction = pgTable(
	"recipe_instruction",
	{
		id: uuid("id").primaryKey(),
		recipeId: uuid("recipe_id").notNull(),
		userId: text("user_id").notNull(),
		sortOrder: integer("sort_order").notNull(),
		text: text("text").notNull(),
		referencedInstructionIds: jsonb("referenced_instruction_ids")
			.$type<string[]>()
			.default([])
			.notNull(),
	},
	(table) => [
		foreignKey({
			name: "recipe_instruction_recipe_owner_fk",
			columns: [table.recipeId, table.userId],
			foreignColumns: [recipe.id, recipe.userId],
		}).onDelete("cascade"),
		index("recipe_instruction_recipe_order_idx").on(
			table.recipeId,
			table.sortOrder,
		),
		check(
			"recipe_instruction_sort_order_nonnegative",
			sql`${table.sortOrder} >= 0`,
		),
		check(
			"recipe_instruction_text_nonempty",
			sql`length(trim(${table.text})) > 0`,
		),
	],
);

// 本文の [[ラベル]] が指すレシピ。相手のレシピが消えたときは、target_recipe_id を空にして、ラベルは残す（表示は「見つからないレシピ」）。
export const recipeLink = pgTable(
	"recipe_link",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		recipeId: uuid("recipe_id").notNull(),
		userId: text("user_id").notNull(),
		label: text("label").notNull(),
		targetRecipeId: uuid("target_recipe_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			name: "recipe_link_recipe_owner_fk",
			columns: [table.recipeId, table.userId],
			foreignColumns: [recipe.id, recipe.userId],
		}).onDelete("cascade"),
		foreignKey({
			name: "recipe_link_target_fk",
			columns: [table.targetRecipeId],
			foreignColumns: [recipe.id],
		}).onDelete("set null"),
		unique("recipe_link_recipe_label_unique").on(table.recipeId, table.label),
		index("recipe_link_recipe_id_idx").on(table.recipeId),
		index("recipe_link_target_idx").on(table.targetRecipeId),
		check(
			"recipe_link_label_valid",
			sql`char_length(${table.label}) BETWEEN 1 AND 100 AND ${table.label} = btrim(${table.label}) AND ${table.label} !~ '[\\[\\]\\n\\r]'`,
		),
	],
);

// 限定公開のレシピを、パスフレーズで開けた人（ログインしたユーザー）の記録。パスフレーズを作り直すと、そのレシピの分は、すべて消す。
export const recipeUnlock = pgTable(
	"recipe_unlock",
	{
		recipeId: uuid("recipe_id")
			.notNull()
			.references(() => recipe.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		unlockedAt: timestamp("unlocked_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.recipeId, table.userId] })],
);

// パスフレーズの入力に失敗した記録（総当たりを防ぐ。1時間に決まった回数で、ロックする）。
// 存在しない・非公開の ID を試したときも、同じように記録する（存在を、推測させないため）。そのため、レシピへの外部キーは持たない。
export const recipeUnlockAttempt = pgTable(
	"recipe_unlock_attempt",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		publicId: text("public_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("recipe_unlock_attempt_recent_idx").on(
			table.userId,
			table.publicId,
			table.createdAt,
		),
	],
);
