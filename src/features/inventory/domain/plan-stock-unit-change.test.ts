import { describe, expect, it } from "vitest";
import type { InventoryLot } from "./inventory-lot";
import { planStockUnitChange } from "./plan-stock-unit-change";

function lot(id: string, quantity: number): InventoryLot {
	return {
		id,
		quantity,
		acquiredOn: "2026-10-01",
		storage: null,
		expiresOn: null,
		expiryKind: null,
		expirySource: null,
		createdAt: "2026-10-01T00:00:00.000Z",
	};
}

const lots = [lot("a", 300), lot("b", 600), lot("empty", 0)];

describe("planStockUnitChange", () => {
	it("入力がなければ、ロットごとに換算する。在庫のないロットは対象にしない", () => {
		expect(planStockUnitChange({ lots, factor: 1 / 250 })).toEqual([
			{ lotId: "a", quantity: 1.2, adjustment: 0 },
			{ lotId: "b", quantity: 2.4, adjustment: 0 },
		]);
	});

	it("ロットごとに入力された数量を使い、換算との差を残す。入力のないロットは換算する", () => {
		expect(
			planStockUnitChange({
				lots,
				factor: 1 / 250,
				lotQuantities: [{ lotId: "a", quantity: 1 }],
			}),
		).toEqual([
			{ lotId: "a", quantity: 1, adjustment: -0.2 },
			{ lotId: "b", quantity: 2.4, adjustment: 0 },
		]);
	});

	it("換算できないときは、全ロットの数量が必要。なければエラー、あれば使う（差は残さない）", () => {
		expect(() => planStockUnitChange({ lots, factor: null })).toThrow(
			"ロットごとの量を入力してください",
		);
		expect(() =>
			planStockUnitChange({
				lots,
				factor: null,
				lotQuantities: [{ lotId: "a", quantity: 5 }],
			}),
		).toThrow("ロットごとの量を入力してください");
		expect(
			planStockUnitChange({
				lots,
				factor: null,
				lotQuantities: [
					{ lotId: "a", quantity: 5 },
					{ lotId: "b", quantity: 0 },
				],
			}),
		).toEqual([
			{ lotId: "a", quantity: 5, adjustment: 0 },
			{ lotId: "b", quantity: 0, adjustment: 0 },
		]);
	});

	it("在庫のないロットや、不正な数量を拒否する", () => {
		expect(() =>
			planStockUnitChange({
				lots,
				factor: 1,
				lotQuantities: [{ lotId: "empty", quantity: 1 }],
			}),
		).toThrow("在庫のあるロット");
		expect(() =>
			planStockUnitChange({
				lots,
				factor: 1,
				lotQuantities: [{ lotId: "a", quantity: -1 }],
			}),
		).toThrow("0以上");
	});
});
