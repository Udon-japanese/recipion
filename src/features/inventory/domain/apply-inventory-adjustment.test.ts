import { describe, expect, it } from "vitest";
import { applyInventoryAdjustment } from "./apply-inventory-adjustment";

describe("applyInventoryAdjustment", () => {
	it("買った数量を在庫へ追加して履歴を作る", () => {
		const occurredAt = new Date("2026-09-22T12:00:00.000Z");

		const result = applyInventoryAdjustment(
			{
				inventoryItemId: "inventory-item-id",
				currentQuantity: 4,
				inputQuantity: 2,
				inputUnitCode: "pack",
				stockUnitCode: "piece",
				stockQuantityPerInputUnit: 6,
				operation: "increase",
				reason: "purchase",
				sourceType: "shopping-item",
				sourceId: "shopping-item-id",
			},
			occurredAt,
		);

		expect(result).toEqual({
			quantity: 16,
			transaction: {
				id: expect.any(String),
				inventoryItemId: "inventory-item-id",
				inputQuantity: 2,
				inputUnitCode: "pack",
				quantityDelta: 12,
				resultingQuantity: 16,
				stockUnitCode: "piece",
				reason: "purchase",
				sourceType: "shopping-item",
				sourceId: "shopping-item-id",
				occurredAt: "2026-09-22T12:00:00.000Z",
			},
		});
	});

	it("レシピで使用した数量を在庫から減らす", () => {
		const result = applyInventoryAdjustment({
			inventoryItemId: "inventory-item-id",
			currentQuantity: 500,
			inputQuantity: 200,
			inputUnitCode: "g",
			stockUnitCode: "g",
			stockQuantityPerInputUnit: 1,
			operation: "decrease",
			reason: "recipe-consumption",
			sourceType: "recipe",
			sourceId: "recipe-id",
		});

		expect(result.quantity).toBe(300);
		expect(result.transaction.quantityDelta).toBe(-200);
		expect(result.transaction.resultingQuantity).toBe(300);
	});

	it("手動調整では参照元を省略できる", () => {
		const result = applyInventoryAdjustment({
			inventoryItemId: "inventory-item-id",
			currentQuantity: 3,
			inputQuantity: 1,
			inputUnitCode: "piece",
			stockUnitCode: "piece",
			stockQuantityPerInputUnit: 1,
			operation: "increase",
			reason: "manual-adjustment",
		});

		expect(result.transaction.sourceType).toBeNull();
		expect(result.transaction.sourceId).toBeNull();
	});

	it("在庫が負数になる減算を拒否する", () => {
		expect(() =>
			applyInventoryAdjustment({
				inventoryItemId: "inventory-item-id",
				currentQuantity: 3,
				inputQuantity: 1,
				inputUnitCode: "pack",
				stockUnitCode: "piece",
				stockQuantityPerInputUnit: 6,
				operation: "decrease",
				reason: "manual-adjustment",
			}),
		).toThrow("在庫数量が不足しています");
	});
});
