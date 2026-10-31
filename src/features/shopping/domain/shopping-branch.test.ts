import { describe, expect, it } from "vitest";
import {
	createShoppingBranch,
	decideShoppingBranch,
	getShoppingBranchSideItems,
	maxShoppingBranchConditionLength,
	maxShoppingBranchLabelLength,
	suggestShoppingBranchSideLabel,
	updateShoppingBranch,
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

	// 欄ごとに、上限ちょうど（通る）と、上限＋1（止まる）。
	it.each([
		[
			"条件",
			maxShoppingBranchConditionLength,
			(text: string) => ({ condition: text }),
		],
		[
			"呼び名",
			maxShoppingBranchLabelLength,
			(text: string) => ({ condition: "安ければ", thenLabel: text }),
		],
	])(
		"%s：上限ちょうど（%i文字）は作れて、上限＋1 は拒否する",
		(_name, limit, input) => {
			expect(() =>
				createShoppingBranch(input("あ".repeat(limit)), 0),
			).not.toThrow();
			expect(() =>
				createShoppingBranch(input("あ".repeat(limit + 1)), 0),
			).toThrow();
		},
	);
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

describe("suggestShoppingBranchSideLabel", () => {
	it("呼び名が空の側だけ、名前を提案する。あれば提案しない", () => {
		expect(suggestShoppingBranchSideLabel(branch, "else", "カレー")).toBe(
			"カレー",
		);
		expect(suggestShoppingBranchSideLabel(branch, "then", "カレー")).toBeNull();
	});

	it("前後の空白を除き、長すぎる名前は切り詰め、空の名前は提案しない", () => {
		expect(suggestShoppingBranchSideLabel(branch, "else", "  カレー  ")).toBe(
			"カレー",
		);
		expect(
			suggestShoppingBranchSideLabel(
				branch,
				"else",
				"あ".repeat(maxShoppingBranchLabelLength + 1),
			),
		).toHaveLength(maxShoppingBranchLabelLength);
		expect(suggestShoppingBranchSideLabel(branch, "else", "   ")).toBeNull();
	});
});

describe("updateShoppingBranch", () => {
	it("条件と呼び名を直す。呼び名が空なら、なしにする。ほかの値は、変えない", () => {
		const updated = updateShoppingBranch(branch, {
			condition: "安ければ",
			thenLabel: "",
			elseLabel: "チキン南蛮",
		});

		expect(updated).toEqual({
			...branch,
			condition: "安ければ",
			thenLabel: null,
			elseLabel: "チキン南蛮",
		});
	});

	it("条件が空なら、拒否する", () => {
		expect(() => updateShoppingBranch(branch, { condition: " " })).toThrow();
	});
});
