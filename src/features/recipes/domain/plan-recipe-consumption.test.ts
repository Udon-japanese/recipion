import { describe, expect, it } from "vitest";
import { buildDictionary } from "#/test/builders/build-ingredient-dictionary";
import type { StandInMode } from "./find-stand-ins";
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
	trackingMode: "exact" | "estimated" | "presence" = "estimated",
): RecipeConsumptionStockItem {
	return {
		inventoryItemId: `inv-${name}`,
		name,
		quantity,
		stockUnitCode,
		stockUnitLabel,
		trackingMode,
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
		"生が無くて、形が自由な冷凍で足りるなら、冷凍から引く",
		need("ブロッコリー", 100, "g"),
		[stock("冷凍ブロッコリー", 500, "g", "g")],
		{
			status: "consume",
			deduct: 100,
			target: "inv-冷凍ブロッコリー",
			viaStandIn: true,
		},
	],
	[
		"有無だけで管理している食材は、量が決まっていても、減らさない",
		need("オリーブオイル", 2, "大さじ"),
		[stock("オリーブオイル", 1, "ml", "ml", "presence")],
		{ status: "presence-only", deduct: null, target: "inv-オリーブオイル" },
	],
	[
		"有無だけで管理している食材は、「適量」でも、減らさない（理由は、量ではなく管理方法）",
		need("オリーブオイル", null, null),
		[stock("オリーブオイル", 1, "ml", "ml", "presence")],
		{ status: "presence-only", deduct: null, target: "inv-オリーブオイル" },
	],
	[
		"有無だけの食材が「ない」（0）なら、引かず、在庫なしとして扱う",
		need("オリーブオイル", 2, "大さじ"),
		[stock("オリーブオイル", 0, "ml", "ml", "presence")],
		{ status: "no-stock", deduct: null },
	],
	[
		"形が決まっている冷凍は、自動では引かず、選ぶ行にする",
		need("玉ねぎ", 100, "g"),
		[stock("冷凍玉ねぎ(みじん切り)", 500, "g", "g")],
		{ status: "choose", deduct: null },
	],
	[
		"形が決まっている冷凍の量が足りなければ、選ぶ行にもしない",
		need("玉ねぎ", 600, "g"),
		[stock("冷凍玉ねぎ(みじん切り)", 500, "g", "g")],
		{ status: "no-stock", deduct: null },
	],
	[
		"生が少しあり、冷凍で全量が足りるなら、冷凍から引く（組み合わせない）",
		need("ブロッコリー", 300, "g"),
		[
			stock("ブロッコリー", 100, "g", "g"),
			stock("冷凍ブロッコリー", 500, "g", "g"),
		],
		{
			status: "consume",
			deduct: 300,
			target: "inv-冷凍ブロッコリー",
			viaStandIn: true,
		},
	],
	[
		"生が少しあり、冷凍でも足りなければ、生のある分だけ引く",
		need("ブロッコリー", 300, "g"),
		[
			stock("ブロッコリー", 100, "g", "g"),
			stock("冷凍ブロッコリー", 200, "g", "g"),
		],
		{ status: "partial", deduct: 100, target: "inv-ブロッコリー" },
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

	it("選ぶ行の候補は、冷凍の必要な量（換算したもの）と、生のある分だけ", () => {
		const [row] = planRecipeConsumption(
			[need("玉ねぎ", 2, "個")],
			[
				stock("玉ねぎ", 1, "count", "個"),
				stock("冷凍玉ねぎ(みじん切り)", 500, "g", "g"),
			],
		);

		expect(row?.status).toBe("choose");
		expect(row?.alternatives).toEqual([
			{
				inventoryItemId: "inv-冷凍玉ねぎ(みじん切り)",
				name: "冷凍玉ねぎ(みじん切り)",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				deduct: 400,
				isOwn: false,
				required: 400,
			},
			{
				inventoryItemId: "inv-玉ねぎ",
				name: "玉ねぎ",
				stockUnitCode: "count",
				stockUnitLabel: "個",
				deduct: 1,
				isOwn: true,
				required: 2,
			},
		]);
	});

	// [設定, 期待する状態]
	const modeCases: [StandInMode, string][] = [
		["auto", "consume"],
		["ask", "choose"],
		["off", "no-stock"],
	];

	it.each(modeCases)(
		"形が自由な冷凍で足りるとき、設定 %s なら %s",
		(mode, status) => {
			const [row] = planRecipeConsumption(
				[need("ブロッコリー", 300, "g")],
				[stock("冷凍ブロッコリー", 500, "g", "g")],
				mode,
			);

			expect(row?.status).toBe(status);
		},
	);

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

	it("作り置きのできあがりは、同じ名前の材料の在庫として引かない", () => {
		const made = {
			...stock("卵焼き", 2, "count", "回分"),
			sourceRecipePublicId: "tamagoyaki-id",
		};
		const [row] = planRecipeConsumption([need("卵焼き", 1, "個")], [made]);

		expect(row?.status).toBe("no-stock");
		expect(row?.deduct).toBeNull();
	});
});

describe("planRecipeConsumption（自分の食材辞書）", () => {
	it("自分で足した呼び名でも、在庫の同じ食材から引く", () => {
		const dictionary = buildDictionary([
			{ name: "マイだし", aliases: ["うちのだし"] },
		]);
		const [row] = planRecipeConsumption(
			[need("うちのだし", 50, "ml")],
			[stock("マイだし", 200, "ml", "ml")],
			"auto",
			dictionary,
		);

		expect(row).toMatchObject({
			status: "consume",
			deduct: 50,
			target: { name: "マイだし" },
			need: { name: "うちのだし" },
		});
	});
});

describe("planRecipeConsumption（管理しない材料）", () => {
	it("管理しない材料は、在庫にあっても引かない", () => {
		const [row] = planRecipeConsumption(
			[need("水", 200, "ml")],
			[stock("水", 1000, "ml", "ml")],
			"auto",
			buildDictionary([{ name: "水", unmanaged: true }]),
		);

		expect(row).toMatchObject({
			status: "unmanaged",
			deduct: null,
			target: null,
		});
	});
});
