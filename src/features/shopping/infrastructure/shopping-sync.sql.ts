import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	check,
	index,
	jsonb,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

import { user } from "#/integrations/better-auth/auth.sql";

// 買い物メモの同期。1行が、項目・店・条件つきメモ・いつも買う店・換算の記憶のどれか1つ（中身は data）。
// 行どうしの参照（項目→店など）は、端末の中のメモと同じく、外部キーにしない（順番に届かなくても、書ける）。
// 消した行は、deleted にして残す（ほかの端末に、消したことを伝える）。
// version：そのユーザーの中で、書くたびに増える番号。端末は、受け取り済みの番号より新しい行を受け取る。
// 端末は、変えたときに知っていた版を添えて送る。サーバーの版がそれより進んでいたら（別の端末が先に変えていたら）、当てない。
export const shoppingRecord = pgTable(
	"shopping_record",
	{
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		kind: text("kind").notNull(),
		id: text("id").notNull(),
		data: jsonb("data"),
		deleted: boolean("deleted").default(false).notNull(),
		version: bigint("version", { mode: "number" }).notNull(),
		// 最後に書いた変更（端末の changeId）。返事を受け取れずに送り直した同じ変更を、二重に当てないため。
		changeId: text("change_id").notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.kind, table.id] }),
		index("shopping_record_user_version_idx").on(table.userId, table.version),
		check(
			"shopping_record_kind_valid",
			sql`${table.kind} in ('item', 'store', 'branch', 'storeDefault', 'conversionMemory')`,
		),
		check(
			"shopping_record_data_present",
			sql`(${table.deleted} and ${table.data} is null) or (not ${table.deleted} and ${table.data} is not null)`,
		),
	],
);

// ユーザーごとの、いまの版の番号。書くときに、この行をロックして、順に増やす（sequence は使わない）。
export const shoppingSyncState = pgTable("shopping_sync_state", {
	userId: text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	version: bigint("version", { mode: "number" }).default(0).notNull(),
});
