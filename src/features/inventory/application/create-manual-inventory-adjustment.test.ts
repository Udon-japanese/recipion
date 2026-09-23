import { describe, expect, it } from "vitest";

import { createManualInventoryAdjustment } from "./create-manual-inventory-adjustment";

const inventoryItemId = "1fc94e80-a9cf-4458-b0e6-3d72550cce06";

const transactionId = "71af9bc7-03ed-4df4-a783-a45e743a81f7";

describe("createManualInventoryAdjustment", () => {
	it("在庫の基準単位で手動増加commandを作る", () => {
		expect(
			createManualInventoryAdjustment(
				{
					inventoryItemId,
					quantity: 2,
					stockUnitCode: "count",
					operation: "increase",
				},
				transactionId,
			),
		).toEqual({
			transactionId,
			inventoryItemId,
			inputQuantity: 2,
			inputUnitCode: "count",
			stockQuantityPerInputUnit: 1,
			operation: "increase",
			reason: "manual-adjustment",
		});
	});

	it("手動減少commandを作れる", () => {
		expect(
			createManualInventoryAdjustment(
				{
					inventoryItemId,
					quantity: 150,
					stockUnitCode: "g",
					operation: "decrease",
				},
				transactionId,
			),
		).toEqual(
			expect.objectContaining({
				inputQuantity: 150,
				inputUnitCode: "g",
				operation: "decrease",
				reason: "manual-adjustment",
			}),
		);
	});

	it.each([
		0,
		-1,
		Number.NaN,
		Number.POSITIVE_INFINITY,
	])("不正な数量%sを拒否する", (quantity) => {
		expect(() =>
			createManualInventoryAdjustment(
				{
					inventoryItemId,
					quantity,
					stockUnitCode: "count",
					operation: "increase",
				},
				transactionId,
			),
		).toThrow();
	});

	it("不正な在庫項目IDを拒否する", () => {
		expect(() =>
			createManualInventoryAdjustment(
				{
					inventoryItemId: "invalid-id",
					quantity: 1,
					stockUnitCode: "count",
					operation: "increase",
				},
				transactionId,
			),
		).toThrow("在庫項目IDが不正です");
	});
});
