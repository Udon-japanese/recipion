import * as v from "valibot";
import {
	parseShoppingSyncRecord,
	type ShoppingSyncRecord,
	shoppingSyncLimits,
} from "./shopping-sync-record";

// 端末が送る1行。中身のほかに、どの変更か（changeId）と、どの版をもとに変えたか（baseVersion）を持つ。
export type ShoppingPushRecord = ShoppingSyncRecord & {
	changeId: string;
	// 変えたときに、端末が知っていたサーバーの版（サーバーにまだない行は 0）。
	baseVersion: number;
	// この端末が前に送ったが、届いたか分からない（返事を受け取れなかった）変更。
	unackedChangeIds: string[];
};

// サーバーにある1行（版と、最後に書いた変更つき）。
export type StoredShoppingRecord = ShoppingSyncRecord & {
	version: number;
	changeId: string;
};

export type VersionedShoppingRecord = ShoppingSyncRecord & { version: number };

export type ShoppingPushResult =
	| { status: "applied"; version: number }
	// 別の端末が先に変えていた。サーバーの行（current）を残し、端末の変更は当てない。
	| { status: "conflict"; current: VersionedShoppingRecord };

export const maxUnackedChangeIds = 5;

// 送られた1行を、サーバーの行に当てるか。
// - duplicate：同じ変更の再送（返事を受け取れずに送り直した）。もう当ててあるので、二重に当てない。
// - apply：端末が知っていた版のまま、ほかのだれも変えていない。または、変わっていたのは、この端末が前に送って届いていた変更だった。
// - conflict：端末が知らない変更が、先にサーバーにある。古い変更で、新しい行を上書きしない。
export function decideShoppingPush(
	existing: StoredShoppingRecord | undefined,
	incoming: ShoppingPushRecord,
): "duplicate" | "apply" | "conflict" {
	if (!existing) {
		return "apply";
	}

	if (existing.changeId === incoming.changeId) {
		return "duplicate";
	}

	if (
		existing.version === incoming.baseVersion ||
		incoming.unackedChangeIds.includes(existing.changeId)
	) {
		return "apply";
	}

	return "conflict";
}

function shoppingRecordKey(record: { kind: string; id: string }) {
	return `${record.kind}\u0000${record.id}`;
}

// 送られた行の並びを、サーバーの行に当てる計画（サーバーのトランザクションの中で使う）。
// 当てる行は、いまの版の続きから、1行ずつ番号を振る。結果は、送られた順。
export function planShoppingPush(
	existingRecords: readonly StoredShoppingRecord[],
	records: readonly ShoppingPushRecord[],
	currentVersion: number,
): {
	results: ShoppingPushResult[];
	writes: StoredShoppingRecord[];
	version: number;
} {
	const existingByKey = new Map(
		existingRecords.map((record) => [shoppingRecordKey(record), record]),
	);
	const writes: StoredShoppingRecord[] = [];
	let version = currentVersion;

	const results = records.map((record): ShoppingPushResult => {
		const existing = existingByKey.get(shoppingRecordKey(record));
		const decision = decideShoppingPush(existing, record);

		if (existing && decision === "duplicate") {
			return { status: "applied", version: existing.version };
		}

		if (existing && decision === "conflict") {
			const { changeId: _changeId, ...current } = existing;

			return { status: "conflict", current };
		}

		version += 1;

		const {
			baseVersion: _baseVersion,
			unackedChangeIds: _unackedChangeIds,
			...written
		} = record;

		writes.push({ ...written, version });

		return { status: "applied", version };
	});

	return { results, writes, version };
}

const changeIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(100));

const pushMetaSchema = v.object({
	changeId: changeIdSchema,
	baseVersion: v.pipe(v.number(), v.integer(), v.minValue(0)),
	unackedChangeIds: v.pipe(
		v.array(changeIdSchema),
		v.maxLength(maxUnackedChangeIds),
	),
});

// 送られてきた1行を確かめる（合わなければ、例外）。
export function parseShoppingPushRecord(input: unknown): ShoppingPushRecord {
	return {
		...parseShoppingSyncRecord(input),
		...v.parse(pushMetaSchema, input),
	};
}

export const shoppingPushRecordsSchema = v.pipe(
	v.array(v.unknown()),
	v.maxLength(shoppingSyncLimits.maxPushRecords),
);
