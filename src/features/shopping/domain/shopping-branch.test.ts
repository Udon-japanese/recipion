import { describe, expect, it } from "vitest";
import {
	createShoppingBranch,
	decideShoppingBranch,
	getShoppingBranchSideItems,
} from "./shopping-branch";
import { createShoppingItem } from "./shopping-item";

const now = new Date("2026-10-12T00:00:00.000Z");
const branch = createShoppingBranch(
	{ condition: "合い挽き200gが売っていたら", thenLabel: "ハンバーグ" },
	0,
	now,
	"branch-1",
);

function branchItem(
	name: string,
	side: "condition" | "then" | "else",
	sortOrder: number,
	branchId = "branch-1",
) {
	return createShoppingItem(
		{ name, branchId, branchSide: side, storeId: "store-a" },
		now,
		sortOrder,
	);
}

describe("createShoppingBranch", () => {
	it("条件を整え、呼び名の空は null にし、条件が空だと拒否する", () => {
		expect(branch).toMatchObject({
			condition: "合い挽き200gが売っていたら",
			thenLabel: "ハンバーグ",
			elseLabel: null,
		});
		expect(() => createShoppingBranch({ condition: "  " }, 0)).toThrow();
	});
});

describe("decideShoppingBranch", () => {
	const items = [
		branchItem("にんじん", "then", 5),
		branchItem("鶏もも", "else", 6),
		branchItem("玉ねぎ", "then", 4),
		branchItem("別の分岐の卵", "then", 7, "branch-2"),
		createShoppingItem({ name: "牛乳" }, now, 0),
		branchItem("合い挽き", "condition", 3),
	];

	it("当てはまるときは、条件の材料と選んだ側を通常の項目にして一覧の最後へ置き、店は保ち、もう一方を捨てる", () => {
		const { released, discardedIds } = decideShoppingBranch(
			items,
			"branch-1",
			"then",
			10,
			now,
		);

		expect(released.map((item) => [item.name, item.sortOrder])).toEqual([
			["合い挽き", 10],
			["玉ねぎ", 11],
			["にんじん", 12],
		]);
		expect(released.every((item) => item.branchId === null)).toBe(true);
		expect(released.every((item) => item.branchSide === null)).toBe(true);
		expect(released.every((item) => item.storeId === "store-a")).toBe(true);
		expect(discardedIds).toEqual([items[1]?.id]);
	});

	it("当てはまらないときは、条件の材料も捨て、別の分岐や通常の項目には触れない", () => {
		const { released, discardedIds } = decideShoppingBranch(
			items,
			"branch-1",
			"else",
			10,
			now,
		);

		expect(released.map((item) => item.name)).toEqual(["鶏もも"]);
		expect(discardedIds).toHaveLength(3);
		expect(getShoppingBranchSideItems(items, "branch-2", "then")).toHaveLength(
			1,
		);
	});
});
