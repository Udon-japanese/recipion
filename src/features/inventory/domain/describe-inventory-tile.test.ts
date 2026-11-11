import { describe, expect, it } from "vitest";
import { describeInventoryTile } from "./describe-inventory-tile";
import type { InventoryTile } from "./inventory-fridge";

function tile(overrides: Partial<InventoryTile> = {}): InventoryTile {
	return {
		key: "a:fridge",
		inventoryItemId: "a",
		zone: "fridge",
		name: "鶏むね肉",
		ingredientName: "鶏むね肉",
		art: [],
		lotCount: 1,
		quantity: 300,
		trackingMode: "estimated",
		stockUnitCode: "g",
		stockUnitLabel: "g",
		isPresent: false,
		isEmpty: false,
		expiry: null,
		approximate: true,
		sortExpiresOn: null,
		sortReading: "とりむね",
		...overrides,
	};
}

describe("describeInventoryTile", () => {
	it.each([
		{
			quantity: 1500,
			unit: "g",
			expected: "鶏むね肉、約 1.5キログラム、冷蔵室",
		},
		{
			quantity: 1234,
			unit: "g",
			expected: "鶏むね肉、約 1.234キログラム、冷蔵室",
		},
		{ quantity: 2000, unit: "ml", expected: "鶏むね肉、約 2リットル、冷蔵室" },
		{
			quantity: 999,
			unit: "ml",
			expected: "鶏むね肉、約 999ミリリットル、冷蔵室",
		},
	] as const)(
		"$quantity$unit は、表示に合わせて読む",
		({ quantity, unit, expected }) => {
			expect(
				describeInventoryTile(
					tile({ quantity, stockUnitCode: unit, stockUnitLabel: unit }),
				),
			).toBe(expected);
		},
	);

	it("食材名、量、ゾーン、期限、ロット数を続けて読む", () => {
		expect(
			describeInventoryTile(
				tile({
					lotCount: 2,
					expiry: {
						expiresOn: "2026-10-16",
						daysLeft: 3,
						level: "near",
						kind: "use-by",
						approximate: false,
						badgeText: "3日",
					},
				}),
			),
		).toBe("鶏むね肉、約 300グラム、冷蔵室、消費期限 10月16日、あと3日");
	});

	it("切れは「期限切れ」、期限の札がなければ期限は読まない", () => {
		expect(
			describeInventoryTile(
				tile({
					expiry: {
						expiresOn: "2026-10-01",
						daysLeft: -13,
						level: "expired",
						kind: null,
						approximate: false,
						badgeText: "期限切れ",
					},
				}),
			),
		).toBe("鶏むね肉、約 300グラム、冷蔵室、期限切れ");
		expect(describeInventoryTile(tile())).toBe(
			"鶏むね肉、約 300グラム、冷蔵室",
		);
	});

	it("有無だけは「あり」「なし」", () => {
		expect(
			describeInventoryTile(
				tile({
					name: "醤油",
					zone: "door",
					trackingMode: "presence",
					isPresent: true,
				}),
			),
		).toBe("醤油、あり、ドア");
	});
});
