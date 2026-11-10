import { liveQuery } from "dexie";
import {
	getLocalDatabase,
	type LocalDatabase,
	type ShoppingSyncVersionRecord,
} from "#/local-db/database";
import type { ShoppingSyncLocalStore } from "../application/sync-shopping-memo";
import {
	planShoppingMemoAdoption,
	type ShoppingMemoData,
} from "../domain/plan-shopping-memo-adoption";
import {
	maxUnackedChangeIds,
	type VersionedShoppingRecord,
} from "../domain/shopping-sync-push";
import type {
	ShoppingRecordKind,
	ShoppingSyncOutboxEntry,
	ShoppingSyncRecord,
} from "../domain/shopping-sync-record";
import {
	addOwnedShoppingData,
	deleteOwnedShoppingData,
	readOwnedShoppingData,
	shoppingMemoTables,
} from "./read-owned-shopping-data";
import { withoutShoppingSyncTracking } from "./shopping-sync-tracking";

type UserScope = `user:${string}`;

function syncTables(database: LocalDatabase) {
	return [
		...shoppingMemoTables(database),
		database.shoppingSyncOutbox,
		database.shoppingSyncStates,
		database.shoppingSyncVersions,
	];
}

function rowKey(entry: {
	ownerScope: string;
	kind: string;
	id: string;
}): [string, string, string] {
	return [entry.ownerScope, entry.kind, entry.id];
}

function versionOf(
	ownerScope: UserScope,
	record: VersionedShoppingRecord,
): ShoppingSyncVersionRecord {
	return {
		ownerScope,
		kind: record.kind,
		id: record.id,
		version: record.version,
		unackedChangeIds: [],
	};
}

// 端末のその持ち主の1行を、同期の行にする（なければ、消した行）。
async function readRecord(
	database: LocalDatabase,
	ownerScope: UserScope,
	kind: ShoppingRecordKind,
	id: string,
): Promise<ShoppingSyncRecord> {
	const deleted = { kind, id, deleted: true, data: null } as const;

	switch (kind) {
		case "item": {
			const row = await database.shoppingItems.get(id);

			if (row?.ownerScope !== ownerScope) return deleted;
			const { ownerScope: _ownerScope, ...data } = row;

			return { kind, id, deleted: false, data };
		}
		case "store": {
			const row = await database.shoppingStores.get(id);

			if (row?.ownerScope !== ownerScope) return deleted;
			const { ownerScope: _ownerScope, ...data } = row;

			return { kind, id, deleted: false, data };
		}
		case "branch": {
			const row = await database.shoppingBranches.get(id);

			if (row?.ownerScope !== ownerScope) return deleted;
			const { ownerScope: _ownerScope, ...data } = row;

			return { kind, id, deleted: false, data };
		}
		case "storeDefault": {
			const row = await database.scopedShoppingStoreDefaults.get([
				ownerScope,
				id,
			]);

			if (!row) return deleted;
			const { ownerScope: _ownerScope, ...data } = row;

			return { kind, id, deleted: false, data };
		}
		case "conversionMemory": {
			const row = await database.scopedShoppingConversionMemories.get([
				ownerScope,
				id,
			]);

			if (!row) return deleted;
			const { ownerScope: _ownerScope, ...data } = row;

			return { kind, id, deleted: false, data };
		}
		case "itemMemory": {
			const row = await database.scopedShoppingItemMemories.get([
				ownerScope,
				id,
			]);

			if (!row) return deleted;
			const { ownerScope: _ownerScope, ...data } = row;

			return { kind, id, deleted: false, data };
		}
	}
}

// 受け取った1行を、端末のその持ち主のメモに当てる。
async function applyRecord(
	database: LocalDatabase,
	ownerScope: UserScope,
	record: ShoppingSyncRecord,
): Promise<void> {
	const owner = { ownerScope };

	// ID の表は、ほかの持ち主の同じ ID の行を、消したり上書きしたりしない。
	const isOtherOwners = async (table: {
		get: (id: string) => Promise<{ ownerScope: string } | undefined>;
	}) => {
		const existing = await table.get(record.id);

		return existing !== undefined && existing.ownerScope !== ownerScope;
	};

	switch (record.kind) {
		case "item":
			if (await isOtherOwners(database.shoppingItems)) return;
			if (record.deleted) {
				await database.shoppingItems.delete(record.id);
			} else {
				await database.shoppingItems.put({ ...record.data, ...owner });
			}
			return;
		case "store":
			if (await isOtherOwners(database.shoppingStores)) return;
			if (record.deleted) {
				await database.shoppingStores.delete(record.id);
			} else {
				await database.shoppingStores.put({ ...record.data, ...owner });
			}
			return;
		case "branch":
			if (await isOtherOwners(database.shoppingBranches)) return;
			if (record.deleted) {
				await database.shoppingBranches.delete(record.id);
			} else {
				await database.shoppingBranches.put({ ...record.data, ...owner });
			}
			return;
		case "storeDefault":
			if (record.deleted) {
				await database.scopedShoppingStoreDefaults.delete([
					ownerScope,
					record.id,
				]);
			} else {
				await database.scopedShoppingStoreDefaults.put({
					...record.data,
					...owner,
				});
			}
			return;
		case "conversionMemory":
			if (record.deleted) {
				await database.scopedShoppingConversionMemories.delete([
					ownerScope,
					record.id,
				]);
			} else {
				await database.scopedShoppingConversionMemories.put({
					...record.data,
					...owner,
				});
			}
			return;
		case "itemMemory":
			if (record.deleted) {
				await database.scopedShoppingItemMemories.delete([
					ownerScope,
					record.id,
				]);
			} else {
				await database.scopedShoppingItemMemories.put({
					...record.data,
					...owner,
				});
			}
			return;
	}
}

function outboxKey(entry: { kind: string; id: string }) {
	return `${entry.kind}\u0000${entry.id}`;
}

// サーバーの行（消していないもの）を、6つの表の形にまとめる。
function toMemoData(records: readonly ShoppingSyncRecord[]): ShoppingMemoData {
	const data: ShoppingMemoData = {
		items: [],
		stores: [],
		branches: [],
		storeDefaults: [],
		conversionMemories: [],
		itemMemories: [],
	};

	for (const record of records) {
		if (record.deleted) continue;

		switch (record.kind) {
			case "item":
				data.items.push(record.data);
				break;
			case "store":
				data.stores.push(record.data);
				break;
			case "branch":
				data.branches.push(record.data);
				break;
			case "storeDefault":
				data.storeDefaults.push(record.data);
				break;
			case "conversionMemory":
				data.conversionMemories.push(record.data);
				break;
			case "itemMemory":
				data.itemMemories.push(record.data);
				break;
		}
	}

	return data;
}

// サーバーにすでにある ID の行は、端末の方を足さない（同じ行が2つにならないように。サーバーの方を残す）。
function withoutServerIds(
	local: ShoppingMemoData,
	server: ShoppingMemoData,
): ShoppingMemoData {
	const ids = (rows: readonly { id: string }[]) =>
		new Set(rows.map((row) => row.id));
	const itemIds = ids(server.items);
	const storeIds = ids(server.stores);
	const branchIds = ids(server.branches);

	return {
		...local,
		items: local.items.filter((row) => !itemIds.has(row.id)),
		stores: local.stores.filter((row) => !storeIds.has(row.id)),
		branches: local.branches.filter((row) => !branchIds.has(row.id)),
	};
}

// 足した行の、送る印。
function entriesOf(
	ownerScope: UserScope,
	data: ShoppingMemoData,
	createChangeId: () => string,
): ShoppingSyncOutboxEntry[] {
	const keys: { kind: ShoppingRecordKind; id: string }[] = [
		...data.items.map((row) => ({ kind: "item" as const, id: row.id })),
		...data.stores.map((row) => ({ kind: "store" as const, id: row.id })),
		...data.branches.map((row) => ({ kind: "branch" as const, id: row.id })),
		...data.storeDefaults.map((row) => ({
			kind: "storeDefault" as const,
			id: row.nameKey,
		})),
		...data.conversionMemories.map((row) => ({
			kind: "conversionMemory" as const,
			id: row.key,
		})),
		...data.itemMemories.map((row) => ({
			kind: "itemMemory" as const,
			id: row.nameKey,
		})),
	];

	return keys.map((key) => ({
		...key,
		ownerScope,
		changeId: createChangeId(),
	}));
}

// 買い物メモの同期で、端末の側の読み書き（Dexie）。
export function createDexieShoppingSyncStore(
	database: LocalDatabase = getLocalDatabase(),
	createChangeId: () => string = () => crypto.randomUUID(),
): ShoppingSyncLocalStore {
	return {
		async readCursor(ownerScope) {
			const state = await database.shoppingSyncStates.get(ownerScope);

			return state?.cursor ?? null;
		},

		// 送る印のある行を、いまの中身と、変えたもとの版つきで読む。
		async readPending(ownerScope, limit) {
			return database.transaction(
				"r",
				[
					...shoppingMemoTables(database),
					database.shoppingSyncOutbox,
					database.shoppingSyncVersions,
				],
				async () => {
					const entries = await database.shoppingSyncOutbox
						.where("ownerScope")
						.equals(ownerScope)
						.limit(limit)
						.toArray();
					const versions = await database.shoppingSyncVersions.bulkGet(
						entries.map(rowKey),
					);
					const records = await Promise.all(
						entries.map(async (entry, index) => ({
							...(await readRecord(database, ownerScope, entry.kind, entry.id)),
							changeId: entry.changeId,
							baseVersion: versions[index]?.version ?? 0,
							unackedChangeIds: versions[index]?.unackedChangeIds ?? [],
						})),
					);

					return { entries, records };
				},
			);
		},

		// 送る前に、送る変更を覚える（返事を受け取れなくても、届いていたら、次の変更をその上に当てられる）。
		async markSent(ownerScope, entries) {
			await database.transaction(
				"rw",
				database.shoppingSyncVersions,
				async () => {
					const versions = await database.shoppingSyncVersions.bulkGet(
						entries.map(rowKey),
					);

					await database.shoppingSyncVersions.bulkPut(
						entries.map((entry, index) => ({
							ownerScope,
							kind: entry.kind,
							id: entry.id,
							version: versions[index]?.version ?? 0,
							unackedChangeIds: [
								...(versions[index]?.unackedChangeIds ?? []),
								entry.changeId,
							].slice(-maxUnackedChangeIds),
						})),
					);
				},
			);
		},

		// 送った結果を当てる。
		// - 当たった行：知っている版を進め、印を外す（送っている間に、また書かれた行は、印を残す）。
		// - 別の端末が先に変えていた行：サーバーの行を端末に当て、端末の変更は捨てる（送っている間に、また書かれていたら、次の同期まで待つ）。
		async acknowledge(ownerScope, entries, results) {
			await database.transaction("rw", syncTables(database), async (tx) => {
				withoutShoppingSyncTracking(tx);

				const current = await database.shoppingSyncOutbox.bulkGet(
					entries.map(rowKey),
				);

				for (const [index, entry] of entries.entries()) {
					const result = results[index];
					const isUnchanged = current[index]?.changeId === entry.changeId;

					if (!result || (result.status === "conflict" && !isUnchanged)) {
						continue;
					}

					if (result.status === "conflict") {
						await applyRecord(database, ownerScope, result.current);
					}

					await database.shoppingSyncVersions.put({
						ownerScope,
						kind: entry.kind,
						id: entry.id,
						version:
							result.status === "applied"
								? result.version
								: result.current.version,
						unackedChangeIds: [],
					});

					if (isUnchanged) {
						await database.shoppingSyncOutbox.delete(rowKey(entry));
					}
				}
			});
		},

		// 受け取った行を当て、知っている版を進める。
		// まだ送っていない行（印がある）は、当てず、版も進めない（送ったときに、サーバーが、先の変更と比べる）。
		async applyPulled(ownerScope, records, cursor) {
			await database.transaction("rw", syncTables(database), async (tx) => {
				withoutShoppingSyncTracking(tx);

				const pending = await database.shoppingSyncOutbox
					.where("ownerScope")
					.equals(ownerScope)
					.toArray();
				const pendingKeys = new Set(pending.map(outboxKey));
				const applied = records.filter(
					(record) => !pendingKeys.has(outboxKey(record)),
				);

				for (const record of applied) {
					await applyRecord(database, ownerScope, record);
				}

				await database.shoppingSyncVersions.bulkPut(
					applied.map((record) => versionOf(ownerScope, record)),
				);
				await database.shoppingSyncStates.put({ ownerScope, cursor });
			});
		},

		// この端末で初めて同期する：サーバーのメモに、端末のメモを合わせて足す（ゲストのメモの引き継ぎと同じ合わせ方）。
		// 足した端末の行だけに、送る印を付ける（サーバーの行は、送り返さない）。
		// いつも買う店・換算の記憶は、同じ食材（×単位）がサーバーにあれば、サーバーの方を残す（planShoppingMemoAdoption）。
		async mergeFirst(ownerScope, records, cursor) {
			await database.transaction("rw", syncTables(database), async (tx) => {
				withoutShoppingSyncTracking(tx);

				const server = toMemoData(records);
				const local = withoutServerIds(
					await readOwnedShoppingData(ownerScope, database),
					server,
				);
				const { mergedStoreCount: _mergedStoreCount, ...added } =
					planShoppingMemoAdoption(local, server);

				await deleteOwnedShoppingData(ownerScope, database);
				await addOwnedShoppingData(ownerScope, server, database);
				await addOwnedShoppingData(ownerScope, added, database);
				await Promise.all(
					[database.shoppingSyncOutbox, database.shoppingSyncVersions].map(
						(table) => table.where("ownerScope").equals(ownerScope).delete(),
					),
				);
				await database.shoppingSyncOutbox.bulkPut(
					entriesOf(ownerScope, added, createChangeId),
				);
				await database.shoppingSyncVersions.bulkPut(
					records.map((record) => versionOf(ownerScope, record)),
				);
				await database.shoppingSyncStates.put({ ownerScope, cursor });
			});
		},

		async countPending(ownerScope) {
			return database.shoppingSyncOutbox
				.where("ownerScope")
				.equals(ownerScope)
				.count();
		},
	};
}

// まだ送っていない行の数を、見張る。
export function watchShoppingSyncPending(
	ownerScope: UserScope,
	onChange: (count: number) => void,
	onError: (error: unknown) => void,
): () => void {
	const subscription = liveQuery(() =>
		getLocalDatabase()
			.shoppingSyncOutbox.where("ownerScope")
			.equals(ownerScope)
			.count(),
	).subscribe({ next: onChange, error: onError });

	return () => subscription.unsubscribe();
}
