import { describe, expect, it } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import {
	assignInventoryZone,
	buildInventoryFridge,
	getExpiryLevel,
	type InventoryCatalogLookup,
} from "./inventory-fridge";
import type { InventoryLot } from "./inventory-lot";

const today = "2026-10-14";

const lookup: InventoryCatalogLookup = (name) =>
	name === "にんじん"
		? { defaultStorage: "fridge", isProduce: true, reading: "にんじん" }
		: name === "塩"
			? { defaultStorage: "room", isProduce: false, reading: "しお" }
			: null;

function lot(overrides: Partial<InventoryLot> = {}): InventoryLot {
	return {
		id: "lot",
		quantity: 1,
		acquiredOn: "2026-10-10",
		storage: null,
		expiresOn: null,
		expiryKind: null,
		expirySource: null,
		createdAt: "2026-10-10T00:00:00.000Z",
		...overrides,
	};
}

describe("assignInventoryZone", () => {
	it.each([
		["presence", "fridge", true, "door"],
		["exact", "freezer", true, "freezer"],
		["exact", "room", true, "table"],
		["exact", "fridge", true, "vegetable"],
		["exact", "fridge", false, "fridge"],
		["exact", null, true, "fridge"],
		["exact", null, false, "fridge"],
	] as const)(
		"%s・%s・野菜=%s → %s",
		(trackingMode, storage, isProduce, zone) => {
			expect(assignInventoryZone({ trackingMode, storage, isProduce })).toBe(
				zone,
			);
		},
	);
});

describe("getExpiryLevel", () => {
	it.each([
		[-1, "expired"],
		[0, "soon"],
		[1, "soon"],
		[2, "near"],
		[3, "near"],
		[4, "none"],
	] as const)("%i日 → %s", (days, level) => {
		expect(getExpiryLevel(days)).toBe(level);
	});
});

describe("buildInventoryFridge", () => {
	function tilesOf(
		items: Parameters<typeof buildInventoryFridge>[0],
		zone: string,
	) {
		return (
			buildInventoryFridge(items, today, lookup).find((z) => z.id === zone)
				?.tiles ?? []
		);
	}

	it("5つのゾーンを、決まった順に返す", () => {
		expect(
			buildInventoryFridge([], today, lookup).map((zone) => zone.id),
		).toEqual(["fridge", "door", "vegetable", "freezer", "table"]);
	});

	it("カタログの保存方法で、ロットの保存方法がなければ決める。ロットの保存方法が優先", () => {
		const items = [
			buildInventoryListItem({
				inventoryItemId: "a",
				name: "にんじん",
				quantity: 2,
				lots: [lot({ id: "a1", quantity: 2 })],
			}),
			buildInventoryListItem({
				inventoryItemId: "b",
				name: "にんじん",
				displayName: "冷凍にんじん",
				quantity: 1,
				lots: [lot({ id: "b1", storage: "freezer" })],
			}),
		];

		expect(tilesOf(items, "vegetable").map((t) => t.inventoryItemId)).toEqual([
			"a",
		]);
		expect(tilesOf(items, "freezer").map((t) => t.inventoryItemId)).toEqual([
			"b",
		]);
	});

	it("ゾーンをまたぐ食材は、ゾーンごとのタイルになり、量と期限はゾーンごとに数える", () => {
		const item = buildInventoryListItem({
			inventoryItemId: "milk",
			name: "牛乳",
			stockUnitCode: "ml",
			stockUnitLabel: "ml",
			quantity: 1500,
			lots: [
				lot({
					id: "m1",
					quantity: 500,
					storage: "fridge",
					expiresOn: "2026-10-15",
				}),
				lot({
					id: "m2",
					quantity: 300,
					storage: "fridge",
					expiresOn: "2026-10-20",
				}),
				lot({
					id: "m3",
					quantity: 700,
					storage: "freezer",
					expiresOn: "2026-12-01",
				}),
			],
		});

		const [fridgeTile] = tilesOf([item], "fridge");
		const [freezerTile] = tilesOf([item], "freezer");

		expect(fridgeTile).toMatchObject({ lotCount: 2, quantity: 800 });
		expect(fridgeTile?.expiry).toMatchObject({
			level: "soon",
			badgeText: "明日",
		});
		expect(freezerTile).toMatchObject({ lotCount: 1, quantity: 700 });
		expect(freezerTile?.expiry).toBeNull();
	});

	it("期限の札は、数量が 0 のロットを数えず、目安は「約」にする", () => {
		const item = buildInventoryListItem({
			quantity: 1,
			lots: [
				lot({
					id: "x",
					quantity: 0,
					storage: "fridge",
					expiresOn: "2026-10-01",
				}),
				lot({
					id: "y",
					quantity: 1,
					storage: "fridge",
					expiresOn: "2026-10-17",
					expirySource: "estimated",
				}),
			],
		});

		expect(tilesOf([item], "fridge")[0]?.expiry).toMatchObject({
			level: "near",
			badgeText: "3日",
			approximate: true,
		});
	});

	it("期限が切れたものは「切れ」", () => {
		const item = buildInventoryListItem({
			lots: [lot({ storage: "fridge", expiresOn: "2026-10-13" })],
		});

		expect(tilesOf([item], "fridge")[0]?.expiry).toMatchObject({
			level: "expired",
			badgeText: "切れ",
		});
	});

	it("期限が近い順、同じなら読み仮名の順。期限なしは最後。ドアは読み仮名の順", () => {
		const make = (id: string, name: string, expiresOn: string | null) =>
			buildInventoryListItem({
				inventoryItemId: id,
				name,
				lots: [lot({ id, storage: "fridge", expiresOn })],
			});

		const items = [
			make("none", "ぎょうざ", null),
			make("late", "あじ", "2026-11-30"),
			make("soon-b", "ぶり", "2026-10-15"),
			make("soon-a", "あさり", "2026-10-15"),
		];

		expect(tilesOf(items, "fridge").map((t) => t.inventoryItemId)).toEqual([
			"soon-a",
			"soon-b",
			"late",
			"none",
		]);

		const doorItems = ["しお", "あぶら"].map((name) =>
			buildInventoryListItem({
				inventoryItemId: name,
				name,
				trackingMode: "presence",
				quantity: 1,
				lots: [
					lot({ id: name, expiresOn: name === "しお" ? "2026-10-15" : null }),
				],
			}),
		);

		expect(tilesOf(doorItems, "door").map((t) => t.inventoryItemId)).toEqual([
			"あぶら",
			"しお",
		]);
	});

	it("有無だけの食材は、ドアに「あり」「なし」で出る。数量 0 のロットなしの食材は、空のタイル", () => {
		const items = [
			buildInventoryListItem({
				inventoryItemId: "shio",
				name: "塩",
				trackingMode: "presence",
				quantity: 0,
				lots: [lot({ quantity: 0 })],
			}),
			buildInventoryListItem({
				inventoryItemId: "egg",
				quantity: 0,
				lots: [],
			}),
		];

		expect(tilesOf(items, "door")[0]).toMatchObject({
			isPresent: false,
			isEmpty: false,
		});
		expect(tilesOf(items, "fridge")[0]).toMatchObject({
			inventoryItemId: "egg",
			isEmpty: true,
		});
	});
});
