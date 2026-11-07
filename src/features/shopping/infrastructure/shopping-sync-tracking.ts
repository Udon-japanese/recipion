import type {
	DBCore,
	DBCoreMutateRequest,
	DBCoreTable,
	DBCoreTransaction,
	Middleware,
	Transaction,
} from "dexie";
import type {
	ShoppingRecordKind,
	ShoppingSyncOutboxEntry,
} from "../domain/shopping-sync-record";

// 買い物メモの行を書いたら、サーバーに送る印（shoppingSyncOutbox）を、同じトランザクションで付ける。
// 書く場所（リポジトリ・購入確定・読み込み・引き継ぎ）ごとに付けると、付け忘れが起きるので、Dexie のミドルウェアで、
// すべての書き込み（put・add・delete・clear・Collection.modify / delete）を見る。
// 印を付けるのは、ログインした人（user:）の行だけ。ゲストのメモは、同期しない。
// 印は、どの行か（持ち主・種類・ID）だけを持つ。送るときに、そのときの行を読む（なければ、消した行として送る）。

export const shoppingSyncOutboxTable = "shoppingSyncOutbox";

// 表ごとの、同期の種類と、行の ID の欄。
const trackedTables: Record<
	string,
	{ kind: ShoppingRecordKind; idField: "id" | "nameKey" | "key" }
> = {
	shoppingItems: { kind: "item", idField: "id" },
	shoppingStores: { kind: "store", idField: "id" },
	shoppingBranches: { kind: "branch", idField: "id" },
	scopedShoppingStoreDefaults: { kind: "storeDefault", idField: "nameKey" },
	scopedShoppingConversionMemories: {
		kind: "conversionMemory",
		idField: "key",
	},
};

// 印を付けないトランザクション（サーバーから受け取った行を当てるとき。送り返さない）。
const untrackedTransactions = new WeakSet<object>();

export function withoutShoppingSyncTracking(transaction: Transaction): void {
	untrackedTransactions.add(transaction.idbtrans);
}

function isUserScope(value: unknown): value is `user:${string}` {
	return typeof value === "string" && value.startsWith("user:");
}

function ownedRowKey(
	value: unknown,
	idField: string,
): { ownerScope: `user:${string}`; id: string } | null {
	if (typeof value !== "object" || value === null) {
		return null;
	}

	const ownerScope: unknown = Reflect.get(value, "ownerScope");
	const id: unknown = Reflect.get(value, idField);

	return isUserScope(ownerScope) && typeof id === "string"
		? { ownerScope, id }
		: null;
}

// 消す行（の、消す前の値）。
// Dexie のミドルウェアの中では、await や Promise.resolve を使わず、Dexie が返す Promise の then でつなぐ
// （ほかの Promise を挟むと、Dexie のトランザクションの文脈が切れる）。
function rowsToDelete(
	table: DBCoreTable,
	req: Extract<DBCoreMutateRequest, { type: "delete" | "deleteRange" }>,
): Promise<readonly unknown[]> {
	switch (req.type) {
		case "delete":
			return table.getMany({ trans: req.trans, keys: req.keys });
		case "deleteRange":
			return table
				.query({
					trans: req.trans,
					values: true,
					query: { index: table.schema.primaryKey, range: req.range },
				})
				.then(({ result }) => result);
	}
}

function trackTable(
	down: DBCore,
	tableName: string,
	createChangeId: () => string,
): DBCoreTable {
	const table = down.table(tableName);
	const tracked = trackedTables[tableName];

	if (!tracked) {
		return table;
	}

	return {
		...table,
		mutate(req) {
			if (untrackedTransactions.has(req.trans)) {
				return table.mutate(req);
			}

			const writeWithEntries = (rows: readonly unknown[]) =>
				table.mutate(req).then((result) => {
					const entries: ShoppingSyncOutboxEntry[] = rows.flatMap((row) => {
						const key = ownedRowKey(row, tracked.idField);

						return key
							? [{ ...key, kind: tracked.kind, changeId: createChangeId() }]
							: [];
					});

					if (entries.length === 0) {
						return result;
					}

					return down
						.table(shoppingSyncOutboxTable)
						.mutate({ type: "put", trans: req.trans, values: entries })
						.then(() => result);
				});

			if (req.type === "add" || req.type === "put") {
				return writeWithEntries(req.values);
			}

			// 主キーが [持ち主, ID] の表は、キーから持ち主が分かるので、消す前に読まない。
			if (req.type === "delete" && tracked.idField !== "id") {
				return writeWithEntries(
					req.keys.map((key: unknown) =>
						Array.isArray(key)
							? { ownerScope: key[0], [tracked.idField]: key[1] }
							: null,
					),
				);
			}

			return rowsToDelete(table, req).then(writeWithEntries);
		},
	};
}

export function createShoppingSyncTrackingMiddleware(
	createChangeId: () => string = () => crypto.randomUUID(),
): Middleware<DBCore> {
	return {
		stack: "dbcore",
		name: "ShoppingSyncTracking",
		create(down) {
			return {
				...down,
				// 買い物メモの表を書くトランザクションには、印の表も入れる（Dexie が Y.js の表を足すのと同じ形）。
				transaction(stores, mode, options): DBCoreTransaction {
					const needsOutbox =
						mode === "readwrite" &&
						!stores.includes(shoppingSyncOutboxTable) &&
						stores.some((store) => store in trackedTables);

					return down.transaction(
						needsOutbox ? [...stores, shoppingSyncOutboxTable] : stores,
						mode,
						options,
					);
				},
				table(tableName) {
					return trackTable(down, tableName, createChangeId);
				},
			};
		},
	};
}
