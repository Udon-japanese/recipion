import { describe, expect, it } from "vitest";
import type { InventoryTile } from "./inventory-fridge";
import {
	compareTilesFor,
	inventoryGroupOf,
	listInventoryGroups,
} from "./inventory-grouping";

function tile(overrides: Partial<InventoryTile>): InventoryTile {
	return {
		key: "a:fridge",
		inventoryItemId: "a",
		zone: "fridge",
		name: "鶏むね肉",
		ingredientName: "鶏むね肉",
		art: [],
		categoryId: null,
		lotCount: 1,
		quantity: 1,
		trackingMode: "exact",
		stockUnitCode: "count",
		stockUnitLabel: "個",
		isPresent: false,
		isEmpty: false,
		expiry: null,
		approximate: false,
		sortExpiresOn: null,
		sortReading: "とりむね",
		sortAddedAt: null,
		...overrides,
	};
}

const today = "2026-10-30";

describe("inventoryGroupOf", () => {
	it("場所は、タイルのゾーン", () => {
		expect(inventoryGroupOf(tile({ zone: "freezer" }), "zone", today)).toBe(
			"freezer",
		);
	});

	it.each([
		["2026-10-29", "expired"],
		["2026-10-30", "soon"],
		["2026-11-02", "soon"],
		["2026-11-03", "week"],
		["2026-11-13", "week"],
		["2026-11-14", "later"],
		[null, "none"],
	])("期限 %s → %s", (sortExpiresOn, group) => {
		expect(inventoryGroupOf(tile({ sortExpiresOn }), "expiry", today)).toBe(
			group,
		);
	});

	// 入れた日は、日本時間の日付で数える（UTC の 15:00 が、日本時間の 0:00）。
	it.each([
		["2026-10-30T05:00:00.000Z", "today"],
		["2026-10-29T15:00:00.000Z", "today"],
		["2026-10-31T01:00:00.000Z", "today"],
		["2026-10-29T14:59:59.000Z", "yesterday"],
		["2026-10-28T15:00:00.000Z", "yesterday"],
		["2026-10-28T14:59:59.000Z", "week"],
		["2026-10-22T15:00:00.000Z", "week"],
		["2026-10-22T14:59:59.000Z", "earlier"],
		[null, "none"],
	])("入れた日時 %s → %s", (sortAddedAt, group) => {
		expect(inventoryGroupOf(tile({ sortAddedAt }), "added", today)).toBe(group);
	});

	it.each([
		["とりむね", "た"],
		["ぎゅうにゅう", "か"],
		["ミルク", "ま"],
		["Tofu", "他"],
	])("読み %s → %s行", (sortReading, row) => {
		expect(inventoryGroupOf(tile({ sortReading }), "kana", today)).toBe(row);
	});

	it.each([
		["household", "household"],
		[null, "none"],
	] as const)("カテゴリ %s → %s", (categoryId, group) => {
		expect(inventoryGroupOf(tile({ categoryId }), "category", today)).toBe(
			group,
		);
	});

	it("どの分類のタイルも、一覧のグループのどれかに入る", () => {
		for (const by of ["zone", "expiry", "added", "kana", "category"] as const) {
			const ids = listInventoryGroups(by).map((group) => group.id);

			expect(ids).toContain(inventoryGroupOf(tile({}), by, today));
		}
	});
});

describe("compareTilesFor", () => {
	it("あいうえおは、カタカナもひらがなとして読み仮名の順に並べる", () => {
		const sorted = [
			tile({ sortReading: "ミルク" }),
			tile({ sortReading: "あじ" }),
			tile({ sortReading: "かぼちゃ" }),
		].sort(compareTilesFor("kana"));

		expect(sorted.map((t) => t.sortReading)).toEqual([
			"あじ",
			"かぼちゃ",
			"ミルク",
		]);
	});

	it.each([
		{
			name: "新しく入れた順",
			tiles: [
				{ sortReading: "あじ", sortAddedAt: "2026-10-28T01:00:00.000Z" },
				{ sortReading: "かぼちゃ", sortAddedAt: "2026-10-30T01:00:00.000Z" },
				{ sortReading: "さけ", sortAddedAt: "2026-10-29T01:00:00.000Z" },
			],
			expected: ["かぼちゃ", "さけ", "あじ"],
		},
		{
			name: "入れた日時のないものは最後",
			tiles: [
				{ sortReading: "あじ", sortAddedAt: null },
				{ sortReading: "かぼちゃ", sortAddedAt: "2026-10-28T01:00:00.000Z" },
			],
			expected: ["かぼちゃ", "あじ"],
		},
		{
			name: "同じ日時・どちらもないときは、読み仮名の順",
			tiles: [
				{ sortReading: "ミルク", sortAddedAt: null },
				{ sortReading: "さけ", sortAddedAt: "2026-10-30T01:00:00.000Z" },
				{ sortReading: "あじ", sortAddedAt: null },
				{ sortReading: "かぼちゃ", sortAddedAt: "2026-10-30T01:00:00.000Z" },
			],
			expected: ["かぼちゃ", "さけ", "あじ", "ミルク"],
		},
	])("入れた日：$name", ({ tiles, expected }) => {
		const sorted = tiles.map((t) => tile(t)).sort(compareTilesFor("added"));

		expect(sorted.map((t) => t.sortReading)).toEqual(expected);
	});
});
