import { describe, expect, it } from "vitest";
import { buildShoppingItem } from "#/test/builders/build-shopping-item";
import {
	groupShoppingItemsByCategory,
	moveShoppingItemInCategory,
	moveShoppingItemInCategoryByOne,
} from "./shopping-category-group";

const items = [
	buildShoppingItem({ id: "b1", categoryId: "dairy", sortOrder: 0 }),
	buildShoppingItem({ id: "a1", categoryId: "produce", sortOrder: 1 }),
	buildShoppingItem({
		id: "b2",
		categoryId: "dairy",
		sortOrder: 2,
		status: "checked",
	}),
	buildShoppingItem({ id: "n1", categoryId: null, sortOrder: 3 }),
	buildShoppingItem({ id: "b3", categoryId: "dairy", sortOrder: 4 }),
];

function ids(list: readonly { id: string }[]) {
	return list.map((item) => item.id);
}

describe("groupShoppingItemsByCategory", () => {
	it("見出しは先頭の項目の並び順、項目は並び順のまま。残りは未チェックの数", () => {
		const groups = groupShoppingItemsByCategory([...items].reverse());

		expect(groups.map((group) => group.categoryId)).toEqual([
			"dairy",
			"produce",
			null,
		]);
		expect(ids(groups[0]?.items ?? [])).toEqual(["b1", "b2", "b3"]);
		expect(groups.map((group) => group.remaining)).toEqual([2, 1, 1]);
		expect(groups[2]?.label).toBe("未分類");
	});
});

describe("moveShoppingItemInCategory", () => {
	it("同じ分類の中だけを入れ替え、他の項目の場所と見出しの順番は変えない", () => {
		const moved = moveShoppingItemInCategory(items, "dairy", 0, 2);

		expect(ids(moved)).toEqual(["b2", "a1", "b3", "n1", "b1"]);
		expect(moved.map((item) => item.sortOrder)).toEqual([0, 1, 2, 3, 4]);
		expect(
			groupShoppingItemsByCategory(moved).map((group) => group.categoryId),
		).toEqual(["dairy", "produce", null]);
	});

	it("範囲の外や同じ位置は、何も変えない", () => {
		expect(ids(moveShoppingItemInCategory(items, "dairy", 0, 3))).toEqual(
			ids(items),
		);
		expect(ids(moveShoppingItemInCategory(items, "dairy", 1, 1))).toEqual(
			ids(items),
		);
	});
});

describe("moveShoppingItemInCategoryByOne", () => {
	it("分類の端では動かない", () => {
		expect(ids(moveShoppingItemInCategoryByOne(items, "b1", "up"))).toEqual(
			ids(items),
		);
		expect(ids(moveShoppingItemInCategoryByOne(items, "b3", "down"))).toEqual(
			ids(items),
		);
	});

	it("1つ下へ動かすと、同じ分類の次の項目と入れ替わる", () => {
		expect(ids(moveShoppingItemInCategoryByOne(items, "b1", "down"))).toEqual([
			"b2",
			"a1",
			"b1",
			"n1",
			"b3",
		]);
	});
});
