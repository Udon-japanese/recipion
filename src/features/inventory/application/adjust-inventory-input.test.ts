import { describe, expect, it } from "vitest";
import { parseAdjustInventoryInput } from "./adjust-inventory-input";

const validInput = {
	transactionId: "71af9bc7-03ed-4df4-a783-a45e743a81f7",
	inventoryItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
	inputQuantity: 1,
	inputUnitCode: " pack ",
	stockQuantityPerInputUnit: 6,
	operation: "increase" as const,
	reason: "purchase" as const,
	sourceType: "shopping-item" as const,
	sourceId: "shopping-item-id",
};

describe("parseAdjustInventoryInput", () => {
	it("在庫操作を検証して文字列を整形する", () => {
		expect(parseAdjustInventoryInput(validInput)).toEqual({
			...validInput,
			inputUnitCode: "pack",
		});
	});

	it("不正な取引IDを拒否する", () => {
		expect(() =>
			parseAdjustInventoryInput({
				...validInput,
				transactionId: "not-a-uuid",
			}),
		).toThrow("取引IDが不正です");
	});

	it("0以下の数量を拒否する", () => {
		expect(() =>
			parseAdjustInventoryInput({
				...validInput,
				inputQuantity: 0,
			}),
		).toThrow("数量は0より大きい数にしてください");
	});
});
