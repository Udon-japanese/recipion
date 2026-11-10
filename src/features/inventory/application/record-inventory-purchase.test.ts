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
			// 買った単位の換算（1pack＝10個）を、ロットに残す。
			lot: {
				purchaseUnit: { label: "pack", quantity: 10, quantityUnitLabel: "個" },
			},
		});

		expect(result).toEqual({
			status: "applied",
			transactionId: "transaction-id",
			quantity: 10,
		});
	});

	it("g・個そのもので買ったときは、ロットに換算を残さない。入力したロットの条件は、そのまま渡す", async () => {
		const inventoryItemResolver: InventoryItemResolver = {
			resolveOrCreateInventoryItem: vi.fn().mockResolvedValue({
				ingredientId: "ingredient-id",
				inventoryItemId: "inventory-item-id",
				name: "鶏もも肉",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				trackingMode: "exact",
			}),
		};
		const inventoryAdjustmentRepository: InventoryAdjustmentRepository = {
			applyAdjustment: vi.fn().mockResolvedValue({
				status: "applied",
				transactionId: "transaction-id",
				quantity: 300,
			}),
		};

		await recordInventoryPurchase(
			{
				transactionId: "transaction-id",
				shoppingItemId: "shopping-item-id",
				ingredientName: "鶏もも肉",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				trackingMode: "exact",
				inputQuantity: 300,
				inputUnitCode: "g",
				stockQuantityPerInputUnit: 1,
				lot: { storage: "fridge" },
			},
			{ inventoryItemResolver, inventoryAdjustmentRepository },
		);

		expect(inventoryAdjustmentRepository.applyAdjustment).toHaveBeenCalledWith(
			expect.objectContaining({
				lot: { storage: "fridge", purchaseUnit: null },
			}),
		);
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

	it("在庫が個の食材を「6個（1個＝110g）」で買うと、6個のまま足し、1個＝110g をロットに残す（重さから個数に直さない）", async () => {
		const applyAdjustment = vi.fn().mockResolvedValue({
			status: "applied",
			transactionId: "t",
			quantity: 6,
			lots: [],
		});
		const buy = (inputQuantity: number, gramsPerUnit: number) =>
			recordInventoryPurchase(
				{
					transactionId: "t",
					shoppingItemId: "s",
					ingredientName: "冷凍うどん",
					stockUnitCode: "g",
					stockUnitLabel: "g",
					trackingMode: "estimated",
					inputQuantity,
					inputUnitCode: "count",
					stockQuantityPerInputUnit: gramsPerUnit,
				},
				{
					inventoryItemResolver: {
						resolveOrCreateInventoryItem: vi.fn().mockResolvedValue({
							ingredientId: "i",
							inventoryItemId: "inv",
							name: "冷凍うどん",
							stockUnitCode: "count",
							stockUnitLabel: "個",
							trackingMode: "estimated",
						}),
					},
					inventoryAdjustmentRepository: { applyAdjustment },
				},
			);

		await buy(5, 200);
		await buy(6, 110);

		expect(applyAdjustment).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				inputQuantity: 5,
				inputUnitCode: "count",
				stockQuantityPerInputUnit: 1,
				lot: {
					purchaseUnit: { label: "個", quantity: 200, quantityUnitLabel: "g" },
				},
			}),
		);
		expect(applyAdjustment).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				inputQuantity: 6,
				stockQuantityPerInputUnit: 1,
				lot: {
					purchaseUnit: { label: "個", quantity: 110, quantityUnitLabel: "g" },
				},
			}),
		);
	});
});
