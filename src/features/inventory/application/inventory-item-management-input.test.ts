import { describe, expect, it } from "vitest";
import {
	parseChangeStockUnitInput,
	parseDeleteInventoryItemInput,
	parseRenameInventoryItemInput,
} from "./inventory-item-management-input";
import { maxInventoryDisplayNameLength } from "./inventory-item-management-repository";

const inventoryItemId = "6b1d4f0e-0a0e-4c85-9a3f-111111111111";

describe("parseRenameInventoryItemInput", () => {
	it("前後の空白を除く。空の名前は、null（食材の名前に戻す）にする", () => {
		expect(
			parseRenameInventoryItemInput({
				inventoryItemId,
				displayName: "  イオンで買った鶏もも  ",
			}).displayName,
		).toBe("イオンで買った鶏もも");
		expect(
			parseRenameInventoryItemInput({ inventoryItemId, displayName: "   " })
				.displayName,
		).toBeNull();
		expect(
			parseRenameInventoryItemInput({ inventoryItemId, displayName: null })
				.displayName,
		).toBeNull();
	});

	it("長すぎる名前と、不正な ID を拒否する", () => {
		expect(() =>
			parseRenameInventoryItemInput({
				inventoryItemId,
				displayName: "あ".repeat(maxInventoryDisplayNameLength + 1),
			}),
		).toThrow();
		expect(() =>
			parseRenameInventoryItemInput({ inventoryItemId: "x", displayName: "a" }),
		).toThrow();
		expect(() =>
			parseDeleteInventoryItemInput({ inventoryItemId: "x" }),
		).toThrow();
	});
});

describe("parseChangeStockUnitInput", () => {
	it("単位とコードと、いまの量（任意）を受け取る。不正な値を拒否する", () => {
		expect(
			parseChangeStockUnitInput({
				inventoryItemId,
				stockUnitCode: "count",
				stockUnitLabel: " 枚 ",
				currentQuantity: 3,
			}),
		).toEqual({
			inventoryItemId,
			stockUnitCode: "count",
			stockUnitLabel: "枚",
			currentQuantity: 3,
		});
		expect(
			parseChangeStockUnitInput({
				inventoryItemId,
				stockUnitCode: "g",
				stockUnitLabel: "g",
			}).currentQuantity,
		).toBeUndefined();
		expect(() =>
			parseChangeStockUnitInput({
				inventoryItemId,
				stockUnitCode: "kg",
				stockUnitLabel: "kg",
			}),
		).toThrow();
		expect(() =>
			parseChangeStockUnitInput({
				inventoryItemId,
				stockUnitCode: "g",
				stockUnitLabel: "g",
				currentQuantity: -1,
			}),
		).toThrow();
	});
});
