import { describe, expect, it } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import {
	buildInventoryFridge,
	type InventoryTile,
} from "../../domain/inventory-fridge";
import { describePetMessage } from "./pet-message";

function tile(name: string, expiresOn: string | null): InventoryTile {
	const [zone] = buildInventoryFridge(
		[
			buildInventoryListItem({
				inventoryItemId: name,
				name,
				quantity: 1,
				lots: [
					{
						id: `${name}-lot`,
						quantity: 1,
						acquiredOn: "2026-10-01",
						storage: null,
						expiresOn,
						expiryKind: expiresOn ? "best-before" : null,
						expirySource: null,
						createdAt: "2026-10-01T00:00:00.000Z",
					},
				],
			}),
		],
		"2026-10-30",
	).filter((item) => item.tiles.length > 0);

	const found = zone?.tiles[0];

	if (!found) {
		throw new Error("tile not built");
	}

	return found;
}

describe("describePetMessage", () => {
	it("夜は、寝ている", () => {
		expect(describePetMessage([], true)).toBe("すやすや…");
	});

	it("期限の近いものがなければ、そう伝える", () => {
		expect(describePetMessage([tile("卵", null)], false)).toBe(
			"きょうは期限の近いものはないよ",
		);
	});

	it("いちばん近いものを伝え、ほかの件数を添える", () => {
		const tiles = [
			tile("牛乳", "2026-10-31"),
			tile("卵", "2026-10-29"),
			tile("豆腐", "2026-11-01"),
		];

		expect(describePetMessage(tiles, false)).toBe(
			"「卵」が切れているよ（ほか2件）",
		);
		expect(describePetMessage([tiles[0] as InventoryTile], false)).toBe(
			"「牛乳」はあしたまでだよ",
		);
		expect(describePetMessage([tiles[2] as InventoryTile], false)).toBe(
			"「豆腐」はあと2日だよ",
		);
	});
});
