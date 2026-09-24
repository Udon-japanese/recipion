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
		name: text("name").notNull(),
		servings: numeric("servings", {
			precision: 10,
			scale: 3,
		}).notNull(),
		note: text("note").default("").notNull(),
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
