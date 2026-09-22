import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	index,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { user } from "#/integrations/better-auth/auth.sql";

export const ingredient = pgTable(
	"ingredient",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		name: text("name").notNull(),
		stockUnitCode: text("stock_unit_code").notNull(),
		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", {
			withTimezone: true,
		})
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
		archivedAt: timestamp("archived_at", {
			withTimezone: true,
		}),
	},
	(table) => [
		unique("ingredient_id_user_id_unique").on(table.id, table.userId),
		index("ingredient_user_id_idx").on(table.userId),
	],
);

export const ingredientAlias = pgTable(
	"ingredient_alias",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		ingredientId: uuid("ingredient_id").notNull(),
		name: text("name").notNull(),
		normalizedName: text("normalized_name").notNull(),
		isPrimary: boolean("is_primary").default(false).notNull(),
		createdAt: timestamp("created_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			name: "ingredient_alias_ingredient_owner_fk",
			columns: [table.ingredientId, table.userId],
			foreignColumns: [ingredient.id, ingredient.userId],
		}).onDelete("cascade"),
		unique("ingredient_alias_user_normalized_name_unique").on(
			table.userId,
			table.normalizedName,
		),
		index("ingredient_alias_ingredient_id_idx").on(table.ingredientId),
		uniqueIndex("ingredient_alias_primary_unique")
			.on(table.ingredientId)
			.where(sql`${table.isPrimary} = true`),
	],
);
