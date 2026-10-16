import { describe, expect, it } from "vitest";
import { buildShoppingItem } from "#/test/builders/build-shopping-item";
import {
	isListedShoppingItem,
	moveListedShoppingItem,
	moveListedShoppingItemByOne,
} from "./shopping-item-order";

// 分類の違う項目と、購入済みの項目が、混ざった並び。
const items = [
	buildShoppingItem({ id: "a", categoryId: "dairy", sortOrder: 0 }),
	buildShoppingItem({
		id: "p1",
		categoryId: "dairy",
		sortOrder: 1,
		status: "purchased",
	}),
	buildShoppingItem({ id: "b", categoryId: "produce", sortOrder: 2 }),
	buildShoppingItem({ id: "c", categoryId: "meat", sortOrder: 3 }),
	buildShoppingItem({
		id: "p2",
		categoryId: "meat",
		sortOrder: 4,
		status: "purchased",
	}),
	buildShoppingItem({ id: "d", categoryId: null, sortOrder: 5 }),
];

function ids(list: readonly { id: string }[]) {
	return list.map((item) => item.id);
}

describe("moveListedShoppingItem", () => {
	it("一覧の項目の位置で動かす。分類は関係なく、どこへでも動かせる", () => {
		// 一覧は a, b, c, d。先頭の a を、最後（d の位置）へ。
		const moved = moveListedShoppingItem(items, isListedShoppingItem, 0, 3);

		expect(ids(moved)).toEqual(["b", "p1", "c", "d", "p2", "a"]);
		expect(moved.map((item) => item.sortOrder)).toEqual([0, 1, 2, 3, 4, 5]);
	});

	it("購入済みの項目の場所は、変えない（間に挟まっていても、位置に数えない）", () => {
		const moved = moveListedShoppingItem(items, isListedShoppingItem, 3, 0);

		expect(ids(moved)).toEqual(["d", "p1", "a", "b", "p2", "c"]);
		// 購入済みは、元の場所（1番目・4番目）のまま。
		expect(moved[1]?.id).toBe("p1");
		expect(moved[4]?.id).toBe("p2");
	});

	it("範囲の外や同じ位置は、何も変えない", () => {
		expect(
			ids(moveListedShoppingItem(items, isListedShoppingItem, 0, 4)),
		).toEqual(ids(items));
		expect(
			ids(moveListedShoppingItem(items, isListedShoppingItem, 2, 2)),
		).toEqual(ids(items));
		expect(
			ids(moveListedShoppingItem(items, isListedShoppingItem, -1, 1)),
		).toEqual(ids(items));
	});
});

describe("moveListedShoppingItemByOne", () => {
	it("1つ下へ動かすと、一覧の次の項目（購入済みを飛ばして）と入れ替わる", () => {
		expect(
			ids(
				moveListedShoppingItemByOne(items, isListedShoppingItem, "a", "down"),
			),
		).toEqual(["b", "p1", "a", "c", "p2", "d"]);
	});

	it("端では動かない。ない項目も、何も変えない", () => {
		expect(
			ids(moveListedShoppingItemByOne(items, isListedShoppingItem, "a", "up")),
		).toEqual(ids(items));
		expect(
			ids(
				moveListedShoppingItemByOne(items, isListedShoppingItem, "d", "down"),
			),
		).toEqual(ids(items));
		expect(
			ids(
				moveListedShoppingItemByOne(items, isListedShoppingItem, "none", "up"),
			),
		).toEqual(ids(items));
	});
});
