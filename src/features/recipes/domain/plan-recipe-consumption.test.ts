import { describe, expect, it } from "vitest";
import {
	planRecipeConsumption,
	type RecipeConsumptionStockItem,
} from "./plan-recipe-consumption";
import type { RecipeShoppingNeed } from "./plan-shopping-from-recipe";

function need(
	name: string,
	quantity: number | null,
	unitLabel: string | null,
	id = name,
): RecipeShoppingNeed {
	return { id, name, quantity, unitLabel, amountText: null };
}

function stock(
	name: string,
	quantity: number,
	stockUnitCode: "count" | "g" | "ml",
	stockUnitLabel: string,
): RecipeConsumptionStockItem {
	return {
		inventoryItemId: `inv-${name}`,
		name,
		quantity,
		stockUnitCode,
		stockUnitLabel,
	};
}

type Expected = {
	status: string;
	deduct: number | null;
	target?: string;
	viaStandIn?: boolean;
};

// [材料, 在庫, 期待する結果]
const cases: [
	string,
	RecipeShoppingNeed,
	RecipeConsumptionStockItem[],
	Expected,
][] = [
	[
		"足りていれば、必要な量を引く",
		need("玉ねぎ", 2, "個"),
		[stock("玉ねぎ", 3, "count", "個")],
		{ status: "consume", deduct: 2, target: "inv-玉ねぎ" },
	],
	[
		"重さの分量を、個数の在庫に換算して引く",
		need("玉ねぎ", 400, "g"),
		[stock("玉ねぎ", 3, "count", "個")],
		{ status: "consume", deduct: 2 },
	],
	[
		"足りなければ、ある分だけ引く",
		need("卵", 6, "個"),
		[stock("卵", 4, "count", "個")],
		{ status: "partial", deduct: 4 },
	],
	[
		"少々・適量は、在庫にあっても引かない",
		need("塩", null, null),
		[stock("塩", 300, "g", "g")],
		{ status: "unmeasurable", deduct: null },
	],
	[
		"換算できない単位は、引かない",
		need("醤油", 1, "つまみ"),
		[stock("醤油", 500, "ml", "ml")],
		{ status: "unmeasurable", deduct: null },
	],
	[
		"在庫に登録がなければ、引かない",
		need("じゃがいも", 2, "個"),
		[stock("玉ねぎ", 3, "count", "個")],
		{ status: "no-stock", deduct: null },
	],
	[
		"生が無くて冷凍で足りるなら、冷凍から引く",
		need("玉ねぎ", 100, "g"),
		[stock("冷凍玉ねぎ(みじん切り)", 500, "g", "g")],
		{
			status: "consume",
			deduct: 100,
			target: "inv-冷凍玉ねぎ(みじん切り)",
			viaStandIn: true,
		},
	],
];

describe("planRecipeConsumption", () => {
	it.each(cases)("%s", (_title, recipeNeed, stockItems, expected) => {
		const [row] = planRecipeConsumption([recipeNeed], stockItems);

		expect(row).toMatchObject({
			status: expected.status,
			deduct: expected.deduct,
			viaStandIn: expected.viaStandIn ?? false,
		});

		if (expected.target) {
			expect(row?.target?.inventoryItemId).toBe(expected.target);
		}
	});

	it("同じ食材が複数行あるとき、残りの在庫を順に使う", () => {
		const rows = planRecipeConsumption(
			[need("卵", 3, "個", "a"), need("卵", 3, "個", "b")],
			[stock("卵", 4, "count", "個")],
		);

		expect(rows.map((row) => [row.status, row.deduct])).toEqual([
			["consume", 3],
			["partial", 1],
		]);
	});
});
