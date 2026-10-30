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

	it.each([
		["とりむね", "た"],
		["ぎゅうにゅう", "か"],
		["ミルク", "ま"],
		["Tofu", "他"],
	])("読み %s → %s行", (sortReading, row) => {
		expect(inventoryGroupOf(tile({ sortReading }), "kana", today)).toBe(row);
	});

	it("どの分類のタイルも、一覧のグループのどれかに入る", () => {
		for (const by of ["zone", "expiry", "kana"] as const) {
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
});
