import type {
	ShoppingPushRecord,
	ShoppingPushResult,
	VersionedShoppingRecord,
} from "../domain/shopping-sync-push";
import {
	type ShoppingSyncOutboxEntry,
	shoppingSyncLimits,
} from "../domain/shopping-sync-record";

type UserScope = `user:${string}`;

export type ShoppingSyncPage = {
	records: VersionedShoppingRecord[];
	cursor: number;
	hasMore: boolean;
};

// 端末の側（Dexie）。
export type ShoppingSyncLocalStore = {
	// 受け取り済みの版。この端末で、まだ一度も同期していなければ null。
	readCursor: (ownerScope: UserScope) => Promise<number | null>;
	// 送る印のある行（いまの中身。なければ、消した行。変えたもとの版つき）。
	readPending: (
		ownerScope: UserScope,
		limit: number,
	) => Promise<{
		entries: ShoppingSyncOutboxEntry[];
		records: ShoppingPushRecord[];
	}>;
	markSent: (
		ownerScope: UserScope,
		entries: readonly ShoppingSyncOutboxEntry[],
	) => Promise<void>;
	acknowledge: (
		ownerScope: UserScope,
		entries: readonly ShoppingSyncOutboxEntry[],
		results: readonly ShoppingPushResult[],
	) => Promise<void>;
	applyPulled: (
		ownerScope: UserScope,
		records: readonly VersionedShoppingRecord[],
		cursor: number,
	) => Promise<void>;
	mergeFirst: (
		ownerScope: UserScope,
		records: readonly VersionedShoppingRecord[],
		cursor: number,
	) => Promise<void>;
	countPending: (ownerScope: UserScope) => Promise<number>;
};

// サーバーの側（サーバー関数）。
export type ShoppingSyncRemote = {
	// 結果は、送った順。
	push: (
		ownerScope: UserScope,
		records: readonly ShoppingPushRecord[],
	) => Promise<ShoppingPushResult[]>;
	pull: (ownerScope: UserScope, after: number) => Promise<ShoppingSyncPage>;
};

export type SyncShoppingMemoResult = {
	pushedCount: number;
	pulledCount: number;
};

// 送り続けても印が減らない（書き続けている）ときに、止める回数。
const maxPushRounds = 20;

async function pullAll(
	ownerScope: UserScope,
	after: number,
	remote: ShoppingSyncRemote,
	onPage: (page: ShoppingSyncPage) => Promise<void>,
): Promise<number> {
	let cursor = after;
	let count = 0;

	for (;;) {
		const page = await remote.pull(ownerScope, cursor);

		await onPage(page);
		count += page.records.length;
		cursor = page.cursor;

		if (!page.hasMore) {
			return count;
		}
	}
}

// 買い物メモを、サーバーと1回同期する（送る → 受け取る）。
// - この端末で初めてなら、先にサーバーのメモをすべて受け取り、端末のメモを合わせて足す。
// - 同じ行を2台で変えたら、先にサーバーに届いた方が勝つ（行ごと。あとから届いた方は、知らない変更の上に当てない）。
// - 返事を受け取れずに送り直した変更は、二重に当てない。
// - まだ送っていない行は、受け取った中身で上書きしない（送ったときに、サーバーが比べる）。
export async function syncShoppingMemo(
	ownerScope: UserScope,
	local: ShoppingSyncLocalStore,
	remote: ShoppingSyncRemote,
): Promise<SyncShoppingMemoResult> {
	let pulledCount = 0;
	let cursor = await local.readCursor(ownerScope);

	if (cursor === null) {
		const records: VersionedShoppingRecord[] = [];
		let lastCursor = 0;

		pulledCount += await pullAll(ownerScope, 0, remote, async (page) => {
			records.push(...page.records);
			lastCursor = page.cursor;
		});
		await local.mergeFirst(ownerScope, records, lastCursor);
		cursor = lastCursor;
	}

	let pushedCount = 0;

	for (let round = 0; round < maxPushRounds; round += 1) {
		const { entries, records } = await local.readPending(
			ownerScope,
			shoppingSyncLimits.maxPushRecords,
		);

		if (records.length === 0) {
			break;
		}

		await local.markSent(ownerScope, entries);
		const results = await remote.push(ownerScope, records);

		await local.acknowledge(ownerScope, entries, results);
		pushedCount += records.length;

		if (records.length < shoppingSyncLimits.maxPushRecords) {
			break;
		}
	}

	pulledCount += await pullAll(ownerScope, cursor, remote, (page) =>
		local.applyPulled(ownerScope, page.records, page.cursor),
	);

	return { pushedCount, pulledCount };
}
