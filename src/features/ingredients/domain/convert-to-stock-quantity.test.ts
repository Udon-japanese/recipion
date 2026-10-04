import { describe, expect, it } from "vitest";
import { convertToStockQuantity } from "./convert-to-stock-quantity";
import { findIngredientCatalogEntry } from "./ingredient-catalog";

function entryOf(name: string) {
	const entry = findIngredientCatalogEntry(name);

	if (!entry) {
		throw new Error(`カタログにありません: ${name}`);
	}

	return entry;
}

describe("convertToStockQuantity", () => {
	it("同じ系統の単位は、カタログなしでも換算する", () => {
		expect(
			convertToStockQuantity({
				quantity: 1.5,
				unitLabel: "kg",
				stockUnitCode: "g",
			}),
		).toBe(1500);
		expect(
			convertToStockQuantity({
				quantity: 2,
				unitLabel: "大さじ",
				stockUnitCode: "ml",
			}),
		).toBe(30);
		expect(
			convertToStockQuantity({
				quantity: 3,
				unitLabel: "個",
				stockUnitCode: "count",
			}),
		).toBe(3);
	});

	it("体積と重さは、密度があるときだけ換算する（塩 大さじ1 → 18g）", () => {
		const input = {
			quantity: 1,
			unitLabel: "大さじ",
			stockUnitCode: "g",
		} as const;

		expect(convertToStockQuantity(input, entryOf("塩"))).toBe(18);
		expect(convertToStockQuantity(input)).toBeNull();
	});

	it("重さから体積（ml）へも換算する", () => {
		expect(
			convertToStockQuantity(
				{ quantity: 120, unitLabel: "g", stockUnitCode: "ml" },
				entryOf("醤油"),
			),
		).toBe(100);
	});

	it("個数と重さは、個数ごとの重さがあるときだけ換算する（玉ねぎ 1個 → 200g）", () => {
		expect(
			convertToStockQuantity(
				{ quantity: 1, unitLabel: "個", stockUnitCode: "g" },
				entryOf("玉ねぎ"),
			),
		).toBe(200);
		expect(
			convertToStockQuantity(
				{ quantity: 100, unitLabel: "g", stockUnitCode: "count" },
				entryOf("玉ねぎ"),
			),
		).toBe(0.5);
	});

	it("数え方が定義にないときは、換算しない", () => {
		expect(
			convertToStockQuantity(
				{ quantity: 1, unitLabel: "袋", stockUnitCode: "g" },
				entryOf("玉ねぎ"),
			),
		).toBeNull();
	});

	it("数量が0以下・無限のときは、換算しない", () => {
		expect(
			convertToStockQuantity({
				quantity: 0,
				unitLabel: "g",
				stockUnitCode: "g",
			}),
		).toBeNull();
		expect(
			convertToStockQuantity({
				quantity: Number.NaN,
				unitLabel: "g",
				stockUnitCode: "g",
			}),
		).toBeNull();
	});
});
