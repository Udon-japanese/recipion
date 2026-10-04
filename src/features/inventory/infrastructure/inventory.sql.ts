import { sql } from "drizzle-orm";
import {
	check,
	date,
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
		trackingMode: text("tracking_mode").default("estimated").notNull(),
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
		check(
			"inventory_item_tracking_mode_valid",
			sql`${table.trackingMode} in ('exact', 'estimated')`,
		),
	],
);

// 在庫のロット（買った・追加した単位）。食材の数量は、ロットの数量の合計（保存せず、足し算で出す）。
export const inventoryLot = pgTable(
	"inventory_lot",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, {
				onDelete: "cascade",
			}),
		inventoryItemId: uuid("inventory_item_id").notNull(),
		quantity: numeric("quantity", {
			precision: 18,
			scale: 6,
		})
			.default("0")
			.notNull(),
		// 買った（追加した）日。
		acquiredOn: date("acquired_on", { mode: "string" }).notNull(),
		// 保存方法（room / fridge / freezer）。空は「食材の初期値に従う」。
		storage: text("storage"),
		// 期限。すべて任意（期限がなくても、ロットは成立する）。
		expiresOn: date("expires_on", { mode: "string" }),
		expiryKind: text("expiry_kind"),
		expirySource: text("expiry_source"),
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
	},
	(table) => [
		foreignKey({
			name: "inventory_lot_item_owner_fk",
			columns: [table.inventoryItemId, table.userId],
			foreignColumns: [inventoryItem.id, inventoryItem.userId],
		}).onDelete("cascade"),
		unique("inventory_lot_id_user_id_unique").on(table.id, table.userId),
		index("inventory_lot_item_id_idx").on(table.inventoryItemId),
		index("inventory_lot_user_expires_on_idx").on(
			table.userId,
			table.expiresOn,
		),
		check("inventory_lot_quantity_nonnegative", sql`${table.quantity} >= 0`),
		check(
			"inventory_lot_storage_valid",
			sql`${table.storage} is null or ${table.storage} in ('room', 'fridge', 'freezer')`,
		),
		check(
			"inventory_lot_expiry_kind_valid",
			sql`${table.expiryKind} is null or ${table.expiryKind} in ('use-by', 'best-before', 'none')`,
		),
		check(
			"inventory_lot_expiry_source_valid",
			sql`${table.expirySource} is null or ${table.expirySource} in ('entered', 'estimated')`,
		),
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
		// この取引が作用したロット。resultingQuantity は、そのロットの取引後の数量。
		inventoryLotId: uuid("inventory_lot_id").references(() => inventoryLot.id, {
			onDelete: "set null",
		}),

		inputQuantity: numeric("input_quantity", {
			precision: 18,
			scale: 6,
		}).notNull(),
		inputUnitCode: text("input_unit_code").notNull(),
		requestedQuantityDelta: numeric("requested_quantity_delta", {
			precision: 18,
			scale: 6,
		}).notNull(),
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
			"inventory_transaction_requested_delta_nonzero",
			sql`${table.requestedQuantityDelta} <> 0`,
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
