import { describe, expect, it } from "vitest";
import {
	createShoppingItem,
	toggleShoppingItem,
} from "../domain/shopping-item";
import { prepareShoppingItemPurchase } from "./prepare-shopping-item-purchase";

describe("prepareShoppingItemPurchase", () => {
	it("チェック済み商品を購入済みにして在庫反映待ちを作る", () => {
		const item = toggleShoppingItem(
			createShoppingItem({
				name: "ホットケーキミックス",
				quantity: 2,
				unitLabel: "袋",
				inventoryConversion: {
					inputUnitCode: "bag",
					stockUnitCode: "g",
					stockUnitLabel: "g",
					stockQuantityPerInputUnit: 200,
					trackingMode: "estimated",
				},
			}),
		);

		const now = new Date("2026-09-22T18:00:00.000Z");

		const result = prepareShoppingItemPurchase(
			item,
			"guest",
			now,
			"transaction-id",
		);

		expect(result.purchasedItem).toEqual({
			...item,
			status: "purchased",
			updatedAt: "2026-09-22T18:00:00.000Z",
		});

		expect(result.outboxEntry).toEqual({
			id: "transaction-id",
			ownerScope: "guest",
			status: "pending",
			payload: {
				transactionId: "transaction-id",
				shoppingItemId: item.id,
				ingredientName: "ホットケーキミックス",
				inputQuantity: 2,
				inputUnitCode: "bag",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				stockQuantityPerInputUnit: 200,
				trackingMode: "estimated",
			},
			attemptCount: 0,
			lastAttemptAt: null,
			lastError: null,
			createdAt: "2026-09-22T18:00:00.000Z",
			updatedAt: "2026-09-22T18:00:00.000Z",
		});
	});

	it("在庫換算がない商品は購入確定を準備しない", () => {
		const item = toggleShoppingItem(
			createShoppingItem({
				name: "謎の商品",
			}),
		);

		expect(() =>
			prepareShoppingItemPurchase(item, "guest", new Date(), "transaction-id"),
		).toThrow("謎の商品の在庫換算を設定してください");
	});

	it("未チェックの商品は購入確定を準備しない", () => {
		const item = createShoppingItem({
			name: "卵",
			quantity: 6,
			unitLabel: "個",
			inventoryConversion: {
				inputUnitCode: "count",
				stockUnitCode: "count",
				stockUnitLabel: "個",
				stockQuantityPerInputUnit: 1,
				trackingMode: "exact",
			},
		});

		expect(() =>
			prepareShoppingItemPurchase(item, "guest", new Date(), "transaction-id"),
		).toThrow("チェック済みの商品だけ購入確定できます");
	});
});
