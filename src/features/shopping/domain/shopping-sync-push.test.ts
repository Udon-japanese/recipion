import { describe, expect, it } from "vitest";
import {
	decideShoppingPush,
	parseShoppingPushRecord,
	type ShoppingPushRecord,
	type StoredShoppingRecord,
} from "./shopping-sync-push";

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
