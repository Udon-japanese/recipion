import * as v from "valibot";
import { describe, expect, it } from "vitest";
import {
	decideShoppingPush,
	findShoppingSyncLimitProblem,
	parseShoppingPushRecord,
	type ShoppingPushRecord,
	type StoredShoppingRecord,
	shoppingPushRecordsSchema,
} from "./shopping-sync-push";
import type { ShoppingSyncRecord } from "./shopping-sync-record";

const stored: StoredShoppingRecord = {
	kind: "store",
	id: "store-1",
	deleted: true,
	data: null,
	version: 7,
	changeId: "change-server",
};

function incoming(
	overrides: Partial<
		Pick<ShoppingPushRecord, "changeId" | "baseVersion" | "unackedChangeIds">
	>,
): ShoppingPushRecord {
	return {
		kind: "store",
		id: "store-1",
		deleted: true,
		data: null,
		changeId: "change-new",
		baseVersion: 7,
		unackedChangeIds: [],
		...overrides,
	};
}

describe("decideShoppingPush", () => {
	it.each([
		["サーバーにまだない行", undefined, incoming({ baseVersion: 0 }), "apply"],
		["知っていた版のまま", stored, incoming({}), "apply"],
		[
			"同じ変更の再送",
			stored,
			incoming({ changeId: "change-server", baseVersion: 3 }),
			"duplicate",
		],
		[
			"進んでいた版は、この端末の届いていた変更",
			stored,
			incoming({ baseVersion: 3, unackedChangeIds: ["change-server"] }),
			"apply",
		],
		[
			"知らない変更が先にある",
			stored,
			incoming({ baseVersion: 3 }),
			"conflict",
		],
	] as const)("%s → %s", (_label, existing, record, expected) => {
		expect(decideShoppingPush(existing, record)).toBe(expected);
	});
});

describe("parseShoppingPushRecord", () => {
	const deletedStore = {
		kind: "store",
		id: "store-1",
		deleted: true,
		data: null,
		changeId: "change-1",
		baseVersion: 3,
		unackedChangeIds: ["change-0"],
	};

	it("行と、送るときの印（変更の ID・もとの版・届いたか分からない変更）を、まとめて読む", () => {
		expect(parseShoppingPushRecord(deletedStore)).toEqual(deletedStore);
	});

	it("1回に送れるのは100行まで（101行は、形の確認で断る）", () => {
		const rows = (count: number) =>
			Array.from({ length: count }, (_, index) => ({
				...deletedStore,
				id: `store-${index}`,
			}));

		expect(v.safeParse(shoppingPushRecordsSchema, rows(100)).success).toBe(
			true,
		);
		expect(v.safeParse(shoppingPushRecordsSchema, rows(101)).success).toBe(
			false,
		);
	});

	it("変更の ID・もとの版がない行は、断る", () => {
		expect(() =>
			parseShoppingPushRecord({
				kind: "store",
				id: "store-1",
				deleted: true,
				data: null,
			}),
		).toThrow();
	});
});

describe("findShoppingSyncLimitProblem", () => {
	const limits = {
		item: 2,
		store: 1,
		branch: 1,
		storeDefault: 1,
		conversionMemory: 1,
		itemMemory: 1,
	};
	const liveStore = (id: string): ShoppingSyncRecord => ({
		kind: "store",
		id,
		deleted: false,
		data: { id, name: id, sortOrder: 0, createdAt: "2026-11-07T00:00:00.000Z" },
	});
	const deletedStore = (id: string): ShoppingSyncRecord => ({
		kind: "store",
		id,
		deleted: true,
		data: null,
	});

	it.each([
		["上限ちょうどまで足す", { store: 0 }, [], [liveStore("a")], null],
		[
			"上限を超えて足す",
			{ store: 1 },
			[],
			[liveStore("b")],
			"買い物メモの店が多すぎます（1件まで）",
		],
		[
			"すでにある行を直す（数は増えない）",
			{ store: 1 },
			[liveStore("a")],
			[liveStore("a")],
			null,
		],
		[
			"消した行を送る（上限に数えない）",
			{ store: 1 },
			[],
			[deletedStore("b")],
			null,
		],
		[
			"上限を超えていても、消すことはできる",
			{ store: 3 },
			[liveStore("a")],
			[deletedStore("a")],
			null,
		],
		[
			"消した行を、よみがえらせて超える",
			{ store: 1 },
			[deletedStore("b")],
			[liveStore("b")],
			"買い物メモの店が多すぎます（1件まで）",
		],
		[
			"1つ消して1つ足す（数は同じ）",
			{ store: 1 },
			[liveStore("a")],
			[deletedStore("a"), liveStore("b")],
			null,
		],
	] as const)("%s", (_label, liveCounts, existing, writes, expected) => {
		expect(
			findShoppingSyncLimitProblem(liveCounts, existing, writes, limits),
		).toBe(expected);
	});
});
