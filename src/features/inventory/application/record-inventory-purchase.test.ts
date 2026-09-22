import { describe, expect, it, vi } from "vitest";

import type { InventoryItemResolver } from "./inventory-item-resolver";
import type { InventoryRepository } from "./inventory-repository";
import { recordInventoryPurchase } from "./record-inventory-purchase";

describe("recordInventoryPurchase", () => {
	it("食材と在庫項目を確保して購入数量を加算する", async () => {
		const inventoryItemResolver: InventoryItemResolver = {
			resolveOrCreateInventoryItem: vi.fn().mockResolvedValue({
				ingredientId: "ingredient-id",
				inventoryItemId: "inventory-item-id",
				name: "卵",
				stockUnitCode: "count",
				stockUnitLabel: "個",
				trackingMode: "exact",
			}),
		};

		const inventoryRepository: InventoryRepository = {
			applyAdjustment: vi.fn().mockResolvedValue({
				status: "applied",
				transactionId: "transaction-id",
				quantity: 10,
			}),
		};

		const result = await recordInventoryPurchase(
			{
				transactionId: "transaction-id",
				shoppingItemId: "shopping-item-id",
				ingredientName: "たまご",
				stockUnitCode: "count",
				stockUnitLabel: "個",
				trackingMode: "exact",
				inputQuantity: 1,
				inputUnitCode: "pack",
				stockQuantityPerInputUnit: 10,
			},
			{
				inventoryItemResolver,
				inventoryRepository,
			},
		);

		expect(
			inventoryItemResolver.resolveOrCreateInventoryItem,
		).toHaveBeenCalledWith({
			ingredientName: "たまご",
			stockUnitCode: "count",
			stockUnitLabel: "個",
			trackingMode: "exact",
		});

		expect(inventoryRepository.applyAdjustment).toHaveBeenCalledWith({
			transactionId: "transaction-id",
			inventoryItemId: "inventory-item-id",
			inputQuantity: 1,
			inputUnitCode: "pack",
			stockQuantityPerInputUnit: 10,
			operation: "increase",
			reason: "purchase",
			sourceType: "shopping-item",
			sourceId: "shopping-item-id",
		});

		expect(result).toEqual({
			status: "applied",
			transactionId: "transaction-id",
			quantity: 10,
		});
	});
});
