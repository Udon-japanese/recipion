import { and, asc, eq, gt, or, sql } from "drizzle-orm";
import type { DB } from "#/db/client";
import {
	planShoppingPush,
	type ShoppingPushRecord,
	type ShoppingPushResult,
	type StoredShoppingRecord,
	type VersionedShoppingRecord,
} from "../domain/shopping-sync-push";
import { parseShoppingSyncRecord } from "../domain/shopping-sync-record";
import { shoppingRecord, shoppingSyncState } from "./shopping-sync.sql";

export type PulledShoppingRecords = {
	// version の小さい順。
	records: VersionedShoppingRecord[];
	// 次に受け取るときの起点（受け取った最後の version。なければ、渡した起点のまま）。
	cursor: number;
	hasMore: boolean;
};

const recordColumns = {
	kind: shoppingRecord.kind,
	id: shoppingRecord.id,
	data: shoppingRecord.data,
	deleted: shoppingRecord.deleted,
	version: shoppingRecord.version,
	changeId: shoppingRecord.changeId,
};

// 書くときに確かめた形を、読むときも確かめる（合わない行は、黙って落とさず、断る）。
function toStored({
	version,
	changeId,
	...row
}: {
	kind: string;
	id: string;
	data: unknown;
	deleted: boolean;
	version: number;
	changeId: string;
}): StoredShoppingRecord {
	return { ...parseShoppingSyncRecord(row), version, changeId };
}

// そのユーザーの、買い物メモの同期の行。
export function createDrizzleShoppingSyncRepository(db: DB, userId: string) {
	return {
		// 送られた行を、1行ずつ当てるか決めて書く（planShoppingPush）。結果は、送られた順。
		// 版の番号は、ユーザーごとの行をロックして、書いた行ごとに増やす（同時に送っても、番号は重ならない）。
		async push(
			records: readonly ShoppingPushRecord[],
		): Promise<ShoppingPushResult[]> {
			if (records.length === 0) {
				return [];
			}

			return db.transaction(async (transaction) => {
				await transaction
					.insert(shoppingSyncState)
					.values({ userId, version: 0 })
					.onConflictDoNothing();

				const [state] = await transaction
					.select({ version: shoppingSyncState.version })
					.from(shoppingSyncState)
					.where(eq(shoppingSyncState.userId, userId))
					.for("update");

				const base = state?.version ?? 0;
				const existingRows = await transaction
					.select(recordColumns)
					.from(shoppingRecord)
					.where(
						and(
							eq(shoppingRecord.userId, userId),
							or(
								...records.map((record) =>
									and(
										eq(shoppingRecord.kind, record.kind),
										eq(shoppingRecord.id, record.id),
									),
								),
							),
						),
					);
				const { results, writes, version } = planShoppingPush(
					existingRows.map(toStored),
					records,
					base,
				);

				if (writes.length > 0) {
					await transaction
						.insert(shoppingRecord)
						.values(
							writes.map((record) => ({
								userId,
								kind: record.kind,
								id: record.id,
								data: record.data,
								deleted: record.deleted,
								version: record.version,
								changeId: record.changeId,
							})),
						)
						.onConflictDoUpdate({
							target: [
								shoppingRecord.userId,
								shoppingRecord.kind,
								shoppingRecord.id,
							],
							set: {
								data: sql`excluded.data`,
								deleted: sql`excluded.deleted`,
								version: sql`excluded.version`,
								changeId: sql`excluded.change_id`,
								updatedAt: sql`now()`,
							},
						});
					await transaction
						.update(shoppingSyncState)
						.set({ version })
						.where(eq(shoppingSyncState.userId, userId));
				}

				return results;
			});
		},

		// 起点より新しい行を、version の小さい順に、limit 件まで。
		async pull(after: number, limit: number): Promise<PulledShoppingRecords> {
			const rows = await db
				.select(recordColumns)
				.from(shoppingRecord)
				.where(
					and(
						eq(shoppingRecord.userId, userId),
						gt(shoppingRecord.version, after),
					),
				)
				.orderBy(asc(shoppingRecord.version))
				.limit(limit + 1);

			const page = rows.slice(0, limit);

			return {
				records: page.map((row) => {
					const { changeId: _changeId, ...record } = toStored(row);

					return record;
				}),
				cursor: page.at(-1)?.version ?? after,
				hasMore: rows.length > limit,
			};
		},
	};
}
