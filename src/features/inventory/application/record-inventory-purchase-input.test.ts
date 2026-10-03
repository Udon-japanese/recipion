import { describe, expect, it } from "vitest";

import { parseRecordInventoryPurchaseInput } from "./record-inventory-purchase-input";

const validInput = {
	transactionId: "71af9bc7-03ed-4df4-a783-a45e743a81f7",
	shoppingItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
	ingredientName: " たまご ",
	stockUnitCode: "count" as const,
	stockUnitLabel: " 個 ",
	trackingMode: "exact" as const,
	inputQuantity: 1,
	inputUnitCode: " pack ",
	stockQuantityPerInputUnit: 10,
};

describe("parseRecordInventoryPurchaseInput", () => {
	it("購入情報を検査して文字列を整形する", () => {
		expect(parseRecordInventoryPurchaseInput(validInput)).toEqual({
			...validInput,
			ingredientName: "たまご",
			stockUnitLabel: "個",
			inputUnitCode: "pack",
		});
	});

	it("管理方式を省略するとestimatedを使う", () => {
		const { trackingMode, ...inputWithoutTrackingMode } = validInput;

		expect(
			parseRecordInventoryPurchaseInput(inputWithoutTrackingMode).trackingMode,
		).toBe("estimated");
	});

	it("不正な買い物項目IDを拒否する", () => {
		expect(() =>
			parseRecordInventoryPurchaseInput({
				...validInput,
				shoppingItemId: "invalid",
			}),
		).toThrow("買い物項目IDが不正です");
	});

	it("0個の購入を拒否する", () => {
		expect(() =>
			parseRecordInventoryPurchaseInput({
				...validInput,
				inputQuantity: 0,
			}),
		).toThrow("数量は0より大きい数にしてください");
	});
});
