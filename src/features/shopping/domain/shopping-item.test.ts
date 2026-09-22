import { describe, expect, it } from "vitest";
import {
	createShoppingItem,
	getShoppingItemConvertedQuantityLabel,
	markShoppingItemAsPurchased,
	toggleShoppingItem,
	updateShoppingItem,
} from "./shopping-item";

describe("createShoppingItem", () => {
	it("入力を整形して買い物項目を作成する", () => {
		const now = new Date("2026-09-20T12:00:00.000Z");

		const item = createShoppingItem(
			{
				name: "  卵  ",
				unitLabel: "  個  ",
			},
			now,
		);

		expect(item).toEqual({
			id: expect.any(String),
			name: "卵",
			quantity: 1,
			unitLabel: "個",
			categoryId: null,
			inventoryConversion: null,
			categoryAssignment: null,
			status: "pending",
			sortOrder: 0,
			createdAt: "2026-09-20T12:00:00.000Z",
			updatedAt: "2026-09-20T12:00:00.000Z",
		});
	});

	it("商品カテゴリを指定できる", () => {
		const item = createShoppingItem({
			name: "卵",
			categoryId: "eggs",
		});

		expect(item.categoryId).toBe("eggs");
		expect(item.categoryAssignment).toBe("manual");
	});

	it("存在しない商品カテゴリを拒否する", () => {
		expect(() =>
			createShoppingItem({
				name: "謎の商品",
				categoryId: "unknown",
			} as never),
		).toThrow("商品カテゴリを確認してください");
	});

	it("指定された並び順を設定する", () => {
		const item = createShoppingItem(
			{ name: "牛乳" },
			new Date("2026-09-21T10:00:00.000Z"),
			3,
		);

		expect(item.sortOrder).toBe(3);
	});

	it("空の商品名を拒否する", () => {
		expect(() => createShoppingItem({ name: "   " })).toThrow(
			"商品名を入力してください",
		);
	});

	it("0以下の数量を拒否する", () => {
		expect(() =>
			createShoppingItem({
				name: "牛乳",
				quantity: 0,
			}),
		).toThrow("数量は0より大きい数にしてください");
	});

	it("在庫換算情報を保持する", () => {
		const item = createShoppingItem({
			name: "牛乳",
			quantity: 1,
			unitLabel: "本",
			inventoryConversion: {
				inputUnitCode: "bottle",
				stockUnitCode: "ml",
				stockUnitLabel: "ml",
				stockQuantityPerInputUnit: 1000,
				trackingMode: "estimated",
			},
		});

		expect(item.inventoryConversion).toEqual({
			inputUnitCode: "bottle",
			stockUnitCode: "ml",
			stockUnitLabel: "ml",
			stockQuantityPerInputUnit: 1000,
			trackingMode: "estimated",
		});
	});
});

describe("updateShoppingItem", () => {
	it("商品の情報を変更し、識別情報と状態を維持する", () => {
		const item = toggleShoppingItem(
			createShoppingItem(
				{
					name: "卵",
					quantity: 6,
					unitLabel: "個",
				},
				new Date("2026-09-21T10:00:00.000Z"),
			),
			new Date("2026-09-21T10:30:00.000Z"),
		);

		const updatedItem = updateShoppingItem(
			item,
			{
				name: "  平飼い卵  ",
				quantity: 10,
				unitLabel: "  個  ",
			},
			new Date("2026-09-21T11:00:00.000Z"),
		);

		expect(updatedItem).toEqual({
			...item,
			name: "平飼い卵",
			quantity: 10,
			unitLabel: "個",
			updatedAt: "2026-09-21T11:00:00.000Z",
		});

		expect(updatedItem.id).toBe(item.id);
		expect(updatedItem.status).toBe("checked");
		expect(updatedItem.createdAt).toBe(item.createdAt);
	});

	it("不正な数量への変更を拒否する", () => {
		const item = createShoppingItem({ name: "牛乳" });

		expect(() =>
			updateShoppingItem(item, {
				name: "牛乳",
				quantity: 0,
				unitLabel: "本",
			}),
		).toThrow("数量は0より大きい数にしてください");
	});
});

describe("toggleShoppingItem", () => {
	it("pendingからcheckedへ変更する", () => {
		const item = createShoppingItem(
			{ name: "牛乳" },
			new Date("2026-09-20T12:00:00.000Z"),
		);

		const checked = toggleShoppingItem(
			item,
			new Date("2026-09-20T13:00:00.000Z"),
		);

		expect(checked.status).toBe("checked");
		expect(checked.updatedAt).toBe("2026-09-20T13:00:00.000Z");
	});

	it("checkedからpendingへ戻せる", () => {
		const item = toggleShoppingItem(createShoppingItem({ name: "牛乳" }));

		expect(toggleShoppingItem(item).status).toBe("pending");
	});
});

describe("markShoppingItemAsPurchased", () => {
	it("チェック済み商品を購入済みにする", () => {
		const item = toggleShoppingItem(createShoppingItem({ name: "卵" }));

		const purchased = markShoppingItemAsPurchased(
			item,
			new Date("2026-09-22T14:00:00.000Z"),
		);

		expect(purchased.status).toBe("purchased");
		expect(purchased.updatedAt).toBe("2026-09-22T14:00:00.000Z");
	});

	it("未チェックの商品は購入確定できない", () => {
		const item = createShoppingItem({
			name: "卵",
		});

		expect(() => markShoppingItemAsPurchased(item)).toThrow(
			"チェック済みの商品だけ購入確定できます",
		);
	});

	it("購入済み商品を再度処理しても変更しない", () => {
		const checked = toggleShoppingItem(createShoppingItem({ name: "卵" }));
		const purchased = markShoppingItemAsPurchased(checked);

		expect(markShoppingItemAsPurchased(purchased)).toBe(purchased);
	});

	it("購入済み商品はチェック操作で戻らない", () => {
		const checked = toggleShoppingItem(createShoppingItem({ name: "卵" }));
		const purchased = markShoppingItemAsPurchased(checked);

		expect(toggleShoppingItem(purchased)).toBe(purchased);
	});
});

describe("getShoppingItemConvertedQuantityLabel", () => {
	it("袋数から在庫へ入る合計グラム数を返す", () => {
		const item = createShoppingItem({
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
		});

		expect(getShoppingItemConvertedQuantityLabel(item)).toBe("400g");
	});

	it("同じ単位を倍率1で換算する場合は重複表示しない", () => {
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

		expect(getShoppingItemConvertedQuantityLabel(item)).toBeNull();
	});

	it("換算情報がない場合は表示しない", () => {
		const item = createShoppingItem({
			name: "謎の商品",
		});

		expect(getShoppingItemConvertedQuantityLabel(item)).toBeNull();
	});
});
