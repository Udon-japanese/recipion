import { describe, expect, it } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import { buildInventoryFridge } from "./inventory-fridge";
import { matchesInventorySearch } from "./inventory-search";

function tileOf(name: string, displayName: string | null = null) {
	const [tile] = buildInventoryFridge(
		[
			buildInventoryListItem({
				name,
				displayName,
				lots: [
					{
						id: "lot",
						quantity: 1,
						acquiredOn: "2026-10-01",
						storage: null,
						expiresOn: null,
						expiryKind: null,
						expirySource: null,
						createdAt: "2026-10-01T00:00:00.000Z",
					},
				],
			}),
		],
		"2026-10-01",
	).flatMap((zone) => zone.tiles);

	if (!tile) {
		throw new Error("タイルができませんでした");
	}

	return tile;
}

describe("matchesInventorySearch", () => {
	it.each([
		["じゃがいも", "ポテト", true],
		["じゃがいも", "じゃが芋", true],
		["玉ねぎ", "たまね", true],
		["玉ねぎ", "タマネギ", true],
		["米", "お米", true],
		["米", "こめ", true],
		["卵", "", true],
		["卵", "牛乳", false],
	])("%s は「%s」で当たる: %s", (name, query, expected) => {
		expect(matchesInventorySearch(tileOf(name), query)).toBe(expected);
	});

	it("呼び名を付けていても、呼び名と、元の食材の別表記の両方で当たる", () => {
		const tile = tileOf("じゃがいも", "男爵");

		expect(matchesInventorySearch(tile, "男爵")).toBe(true);
		expect(matchesInventorySearch(tile, "ポテト")).toBe(true);
	});
});
