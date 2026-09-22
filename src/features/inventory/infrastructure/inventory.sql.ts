import { sql } from "drizzle-orm";
import {
	check,
	foreignKey,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

import { ingredient } from "#/features/ingredients/infrastructure/ingredient.sql";
import { user } from "#/integrations/better-auth/auth.sql";

export const inventoryItem = pgTable(
	"inventory_item",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		ingredientId: uuid("ingredient_id").notNull(),
		quantity: numeric("quantity", {
			precision: 18,
			scale: 6,
		})
			.default("0")
			.notNull(),
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
		foreignKey({
			name: "inventory_item_ingredient_owner_fk",
			columns: [table.ingredientId, table.userId],
			foreignColumns: [ingredient.id, ingredient.userId],
		}).onDelete("restrict"),
		unique("inventory_item_id_user_id_unique").on(table.id, table.userId),
		unique("inventory_item_user_ingredient_unique").on(
			table.userId,
			table.ingredientId,
		),
		index("inventory_item_user_id_idx").on(table.userId),
		check("inventory_item_quantity_nonnegative", sql`${table.quantity} >= 0`),
	],
);

export const inventoryTransaction = pgTable(
	"inventory_transaction",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		inventoryItemId: uuid("inventory_item_id").notNull(),

		inputQuantity: numeric("input_quantity", {
			precision: 18,
			scale: 6,
		}).notNull(),
		inputUnitCode: text("input_unit_code").notNull(),

		quantityDelta: numeric("quantity_delta", {
			precision: 18,
			scale: 6,
		}).notNull(),
		resultingQuantity: numeric("resulting_quantity", {
			precision: 18,
			scale: 6,
		}).notNull(),
		stockUnitCode: text("stock_unit_code").notNull(),

		reason: text("reason").notNull(),
		sourceType: text("source_type"),
		sourceId: text("source_id"),

		occurredAt: timestamp("occurred_at", {
			withTimezone: true,
		}).notNull(),
		recordedAt: timestamp("recorded_at", {
			withTimezone: true,
		})
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			name: "inventory_transaction_item_owner_fk",
			columns: [table.inventoryItemId, table.userId],
			foreignColumns: [inventoryItem.id, inventoryItem.userId],
		}).onDelete("cascade"),
		check(
			"inventory_transaction_input_quantity_positive",
			sql`${table.inputQuantity} > 0`,
		),
		check(
			"inventory_transaction_delta_nonzero",
			sql`${table.quantityDelta} <> 0`,
		),
		check(
			"inventory_transaction_result_nonnegative",
			sql`${table.resultingQuantity} >= 0`,
		),
		index("inventory_transaction_user_occurred_at_idx").on(
			table.userId,
			table.occurredAt.desc(),
		),
		index("inventory_transaction_item_occurred_at_idx").on(
			table.inventoryItemId,
			table.occurredAt.desc(),
		),
	],
);
