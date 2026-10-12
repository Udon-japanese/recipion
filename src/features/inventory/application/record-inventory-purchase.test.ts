import { describe, expect, it, vi } from "vitest";
import type { InventoryAdjustmentRepository } from "./inventory-adjustment-repository";
import type { InventoryItemResolver } from "./inventory-item-resolver";
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

		const inventoryAdjustmentRepository: InventoryAdjustmentRepository = {
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
				inventoryAdjustmentRepository,
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

		expect(inventoryAdjustmentRepository.applyAdjustment).toHaveBeenCalledWith({
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

	describe("在庫の単位が、買い物メモの換算の単位と違うとき", () => {
		function setup(resolved: {
			stockUnitCode: "count" | "g" | "ml";
			stockUnitLabel: string;
			trackingMode?: "exact" | "estimated" | "presence";
		}) {
			const applyAdjustment = vi.fn().mockResolvedValue({
				status: "applied",
				transactionId: "t",
				quantity: 1,
				lots: [],
			});

			return {
				applyAdjustment,
				dependencies: {
					inventoryItemResolver: {
						resolveOrCreateInventoryItem: vi.fn().mockResolvedValue({
							ingredientId: "i",
							inventoryItemId: "inv",
							name: "鶏もも肉",
							trackingMode: "estimated",
							quantity: 0,
							...resolved,
						}),
					} satisfies InventoryItemResolver,
					inventoryAdjustmentRepository: {
						applyAdjustment,
					} satisfies InventoryAdjustmentRepository,
				},
			};
		}

		const gramsPurchase = {
			transactionId: "t",
			shoppingItemId: "s",
			ingredientName: "鶏もも肉",
			stockUnitCode: "g" as const,
			stockUnitLabel: "g",
			trackingMode: "estimated" as const,
			inputQuantity: 1,
			inputUnitCode: "pack",
			stockQuantityPerInputUnit: 500,
		};

		it("g で買ったものを、枚の在庫に換算して足す（500g → 2枚）", async () => {
			const { dependencies, applyAdjustment } = setup({
				stockUnitCode: "count",
				stockUnitLabel: "枚",
			});

			await recordInventoryPurchase(gramsPurchase, dependencies);

			expect(applyAdjustment).toHaveBeenCalledWith(
				expect.objectContaining({
					inputQuantity: 2,
					inputUnitCode: "count",
					stockQuantityPerInputUnit: 1,
				}),
			);
		});

		it("同じ単位なら、そのまま足す", async () => {
			const { dependencies, applyAdjustment } = setup({
				stockUnitCode: "g",
				stockUnitLabel: "g",
			});

			await recordInventoryPurchase(gramsPurchase, dependencies);

			expect(applyAdjustment).toHaveBeenCalledWith(
				expect.objectContaining({
					inputQuantity: 1,
					inputUnitCode: "pack",
					stockQuantityPerInputUnit: 500,
				}),
			);
		});

		it("換算できないときは、足さずに失敗にする（数量を狂わせない）", async () => {
			const { dependencies, applyAdjustment } = setup({
				stockUnitCode: "ml",
				stockUnitLabel: "ml",
			});

			await expect(
				recordInventoryPurchase(gramsPurchase, dependencies),
			).rejects.toThrow("換算できません");
			expect(applyAdjustment).not.toHaveBeenCalled();
		});

		it("有無だけの食材は、換算しない（量を使わない）", async () => {
			const { dependencies, applyAdjustment } = setup({
				stockUnitCode: "ml",
				stockUnitLabel: "ml",
				trackingMode: "presence",
			});

			await recordInventoryPurchase(gramsPurchase, dependencies);

			expect(applyAdjustment).toHaveBeenCalledTimes(1);
		});
	});
});
