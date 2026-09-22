import { describe, expect, it } from "vitest";
import { createShoppingItem, type ShoppingItem } from "./shopping-item";
import {
	moveShoppingItem,
	moveShoppingItemToIndex,
} from "./shopping-item-order";

function createItems(): ShoppingItem[] {
	return ["卵", "牛乳", "食パン"].map((name, index) =>
		createShoppingItem(
			{ name },
			new Date(`2026-09-21T10:0${index}:00.000Z`),
			index,
		),
	);
}

describe("moveShoppingItem", () => {
	it("項目を一つ上へ移動する", () => {
		const items = createItems();

		const reorderedItems = moveShoppingItem(
			items,
			items[1].id,
			"up",
			new Date("2026-09-21T11:00:00.000Z"),
		);

		expect(reorderedItems.map((item) => item.name)).toEqual([
			"牛乳",
			"卵",
			"食パン",
		]);
		expect(reorderedItems.map((item) => item.sortOrder)).toEqual([0, 1, 2]);
	});

	it("項目を一つ下へ移動する", () => {
		const items = createItems();

		const reorderedItems = moveShoppingItem(items, items[1].id, "down");

		expect(reorderedItems.map((item) => item.name)).toEqual([
			"卵",
			"食パン",
			"牛乳",
		]);
	});

	it("端より外へは移動しない", () => {
		const items = createItems();

		expect(
			moveShoppingItem(items, items[0].id, "up").map((item) => item.name),
		).toEqual(["卵", "牛乳", "食パン"]);

		expect(
			moveShoppingItem(items, items[2].id, "down").map((item) => item.name),
		).toEqual(["卵", "牛乳", "食パン"]);
	});

	it("存在しない項目を指定しても内容を変更しない", () => {
		const items = createItems();

		expect(
			moveShoppingItem(items, "missing", "up").map((item) => item.name),
		).toEqual(["卵", "牛乳", "食パン"]);
	});

	describe("moveShoppingItemToIndex", () => {
		it("項目を任意の位置へ移動する", () => {
			const items = createItems();

			const reorderedItems = moveShoppingItemToIndex(
				items,
				0,
				2,
				new Date("2026-09-22T12:00:00.000Z"),
			);

			expect(reorderedItems.map((item) => item.name)).toEqual([
				"牛乳",
				"食パン",
				"卵",
			]);
			expect(reorderedItems.map((item) => item.sortOrder)).toEqual([0, 1, 2]);
		});

		it("同じ位置への移動では順序を変更しない", () => {
			const items = createItems();

			expect(
				moveShoppingItemToIndex(items, 1, 1).map((item) => item.name),
			).toEqual(["卵", "牛乳", "食パン"]);
		});

		it("範囲外の位置では順序を変更しない", () => {
			const items = createItems();

			expect(
				moveShoppingItemToIndex(items, 0, 99).map((item) => item.name),
			).toEqual(["卵", "牛乳", "食パン"]);
		});
	});
});
