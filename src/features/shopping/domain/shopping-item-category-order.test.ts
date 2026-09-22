import { describe, expect, it } from "vitest";
import { createShoppingItem } from "./shopping-item";
import { sortShoppingItemsByCategory } from "./shopping-item-category-order";

describe("sortShoppingItemsByCategory", () => {
	it("標準的な売り場順に並べる", () => {
		const items = [
			createShoppingItem(
				{ name: "卵", categoryId: "eggs" },
				new Date("2026-09-21T10:00:00.000Z"),
				0,
			),
			createShoppingItem(
				{ name: "玉ねぎ", categoryId: "produce" },
				new Date("2026-09-21T10:01:00.000Z"),
				1,
			),
			createShoppingItem(
				{ name: "牛乳", categoryId: "dairy" },
				new Date("2026-09-21T10:02:00.000Z"),
				2,
			),
		];

		const sortedItems = sortShoppingItemsByCategory(items, {
			now: new Date("2026-09-21T11:00:00.000Z"),
		});

		expect(sortedItems.map((item) => item.name)).toEqual([
			"玉ねぎ",
			"牛乳",
			"卵",
		]);
		expect(sortedItems.map((item) => item.sortOrder)).toEqual([0, 1, 2]);
	});

	it("同じカテゴリ内では現在の手動順序を維持する", () => {
		const items = [
			createShoppingItem(
				{ name: "トマト", categoryId: "produce" },
				new Date(),
				1,
			),
			createShoppingItem(
				{ name: "玉ねぎ", categoryId: "produce" },
				new Date(),
				0,
			),
		];

		expect(sortShoppingItemsByCategory(items).map((item) => item.name)).toEqual(
			["玉ねぎ", "トマト"],
		);
	});

	it("カテゴリ未設定の商品を最後にする", () => {
		const items = [
			createShoppingItem({ name: "謎の商品" }, new Date(), 0),
			createShoppingItem({ name: "卵", categoryId: "eggs" }, new Date(), 1),
		];

		expect(sortShoppingItemsByCategory(items).map((item) => item.name)).toEqual(
			["卵", "謎の商品"],
		);
	});

	it("店舗固有のカテゴリ順を利用できる", () => {
		const items = [
			createShoppingItem(
				{ name: "玉ねぎ", categoryId: "produce" },
				new Date(),
				0,
			),
			createShoppingItem({ name: "卵", categoryId: "eggs" }, new Date(), 1),
		];

		expect(
			sortShoppingItemsByCategory(items, {
				categoryOrder: ["eggs", "produce"],
			}).map((item) => item.name),
		).toEqual(["卵", "玉ねぎ"]);
	});

	it("売り場順を逆回りにできる", () => {
		const items = [
			createShoppingItem(
				{ name: "玉ねぎ", categoryId: "produce" },
				new Date(),
				0,
			),
			createShoppingItem({ name: "牛乳", categoryId: "dairy" }, new Date(), 1),
			createShoppingItem({ name: "卵", categoryId: "eggs" }, new Date(), 2),
		];

		const sortedItems = sortShoppingItemsByCategory(items, {
			direction: "reverse",
		});

		expect(sortedItems.map((item) => item.name)).toEqual([
			"卵",
			"牛乳",
			"玉ねぎ",
		]);
		expect(sortedItems.map((item) => item.sortOrder)).toEqual([0, 1, 2]);
	});
});
