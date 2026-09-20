import { describe, expect, it } from "vitest";
import { createShoppingItem, toggleShoppingItem } from "./shopping-item";

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
			status: "pending",
			createdAt: "2026-09-20T12:00:00.000Z",
			updatedAt: "2026-09-20T12:00:00.000Z",
		});
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
