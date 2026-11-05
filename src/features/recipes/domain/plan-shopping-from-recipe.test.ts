import { describe, expect, it } from "vitest";
import type { StandInMode } from "./find-stand-ins";
import {
	flattenRecipeIngredients,
	type PlanShoppingFromRecipeInput,
	planShoppingFromRecipe,
	type RecipeShoppingNeed,
	withRangeUpperBound,
} from "./plan-shopping-from-recipe";
import type { RecipeEditorIngredientNode } from "./recipe-editor-document";

function need(
	name: string,
	quantity: number | null,
	unitLabel: string | null,
	id = name,
): RecipeShoppingNeed {
	return { id, name, quantity, unitLabel, amountText: null };
}

function plan(
	overrides: Partial<PlanShoppingFromRecipeInput> & {
		needs: RecipeShoppingNeed[];
	},
) {
	return planShoppingFromRecipe({
		stockItems: [],
		memoItems: [],
		duplicateMode: "max",
		...overrides,
	});
}

describe("flattenRecipeIngredients", () => {
	it("グループの中の材料も、1行ずつに展開する（グループ自体は含まない）", () => {
		const nodes: RecipeEditorIngredientNode[] = [
			{
				type: "ingredient",
				id: "a",
				status: "parsed",
				rawText: "卵 1個",
				name: "卵",
				amountText: "1個",
				quantity: 1,
				unitLabel: "個",
			},
			{
				type: "group",
				id: "g",
				name: "調味料",
				rawText: "☆調味料",
				inferred: false,
				children: [
					{
						type: "ingredient",
						id: "b",
						status: "missing-amount",
						rawText: "塩",
						name: "塩",
						amountText: null,
						quantity: null,
						unitLabel: null,
					},
				],
			},
		];

		expect(flattenRecipeIngredients(nodes).map((item) => item.name)).toEqual([
			"卵",
			"塩",
		]);
	});
});

describe("planShoppingFromRecipe：在庫との比較", () => {
	it("足りているものは、初期ではチェックしない。足りないものは、チェックする", () => {
		const rows = plan({
			needs: [need("卵", 2, "個"), need("玉ねぎ", 3, "個")],
			stockItems: [
				{
					name: "卵",
					quantity: 6,
					stockUnitCode: "count",
					stockUnitLabel: "個",
				},
				{
					name: "玉ねぎ",
					quantity: 1,
					stockUnitCode: "count",
					stockUnitLabel: "個",
				},
			],
		});

		expect(rows[0]).toMatchObject({ defaultChecked: false, plan: "add" });
		// 玉ねぎは、あと2個
		expect(rows[1]).toMatchObject({
			defaultChecked: true,
			amount: { quantity: 2, unitLabel: "個" },
			nextQuantity: 2,
		});
	});

	it("在庫にない食材は、レシピの量で入れる（計量の単位・数量なしは、「1」）", () => {
		const rows = plan({
			needs: [
				need("豚バラ肉", 100, "g"),
				need("醤油", 2, "大さじ"),
				need("大葉", null, null),
			],
		});

		expect(rows[0]?.amount).toEqual({ quantity: 100, unitLabel: "g" });
		expect(rows[1]?.amount).toEqual({ quantity: 1, unitLabel: null });
		expect(rows[2]?.amount).toEqual({ quantity: 1, unitLabel: null });
		expect(rows.every((row) => row.defaultChecked)).toBe(true);
	});

	it("「少々」「適量」は、在庫があれば足りている（塩・醤油を在庫に登録しておく）", () => {
		const rows = plan({
			needs: [need("塩", null, null), need("大葉", null, null)],
			stockItems: [
				{ name: "塩", quantity: 1, stockUnitCode: "g", stockUnitLabel: "g" },
			],
		});

		expect(rows[0]).toMatchObject({ defaultChecked: false });
		expect(rows[1]).toMatchObject({ defaultChecked: true });
	});

	it("在庫の情報がない（ゲスト）ときは、すべて必要として、チェックする", () => {
		const rows = plan({
			needs: [need("卵", 2, "個")],
			stockItems: null,
		});

		expect(rows[0]).toMatchObject({
			stock: { kind: "unknown" },
			defaultChecked: true,
		});
	});

	it("別名でも、同じ食材として、在庫を見つける", () => {
		const rows = plan({
			needs: [need("しょうゆ", 1, "大さじ")],
			stockItems: [
				{
					name: "醤油",
					quantity: 500,
					stockUnitCode: "ml",
					stockUnitLabel: "ml",
				},
			],
		});

		expect(rows[0]?.defaultChecked).toBe(false);
	});
});

describe("planShoppingFromRecipe：買い物メモに、同じ食材がある", () => {
	const memo = [{ id: "m1", name: "玉ねぎ", quantity: 1, unitLabel: "個" }];
	const stock = [
		{
			name: "玉ねぎ",
			quantity: 0,
			stockUnitCode: "count" as const,
			stockUnitLabel: "個",
		},
	];

	it("多い方に合わせる：メモの数量より多ければ、更新する", () => {
		const rows = plan({
			needs: [need("玉ねぎ", 3, "個")],
			stockItems: stock,
			memoItems: memo,
			duplicateMode: "max",
		});

		expect(rows[0]).toMatchObject({
			plan: "update",
			nextQuantity: 3,
			defaultChecked: true,
		});
	});

	it("多い方に合わせる：メモの数量が、同じか多ければ、そのまま（二重に追加しない）", () => {
		const rows = plan({
			needs: [need("玉ねぎ", 1, "個")],
			stockItems: stock,
			memoItems: memo,
			duplicateMode: "max",
		});

		expect(rows[0]).toMatchObject({
			plan: "keep",
			keepReason: "already-enough",
			defaultChecked: false,
		});
	});

	it("合算：メモの数量に足す", () => {
		const rows = plan({
			needs: [need("玉ねぎ", 2, "個")],
			stockItems: stock,
			memoItems: memo,
			duplicateMode: "sum",
		});

		expect(rows[0]).toMatchObject({ plan: "update", nextQuantity: 3 });
	});

	it("追加しない：メモのまま", () => {
		const rows = plan({
			needs: [need("玉ねぎ", 5, "個")],
			stockItems: stock,
			memoItems: memo,
			duplicateMode: "skip",
		});

		expect(rows[0]).toMatchObject({ plan: "keep", keepReason: "skip-mode" });
	});

	it("単位が違えば、自動では変えない", () => {
		const rows = plan({
			needs: [need("玉ねぎ", 300, "g")],
			memoItems: memo,
			duplicateMode: "sum",
		});

		expect(rows[0]).toMatchObject({
			plan: "keep",
			keepReason: "incomparable-unit",
		});
	});

	it("別名・全角半角が違っても、同じ食材としてメモの項目を見つける", () => {
		const rows = plan({
			needs: [need("たまねぎ", 3, "個")],
			memoItems: memo,
			duplicateMode: "max",
		});

		expect(rows[0]?.existing?.id).toBe("m1");
	});

	// メモに、同じ食材の行が2つ（1袋・2個の順）。レシピは玉ねぎ3個（在庫なし）。
	describe("同じ食材の行が複数あるとき、同じ単位の行を相手にする", () => {
		const twoRows = [
			{ id: "bag", name: "玉ねぎ", quantity: 1, unitLabel: "袋" },
			{ id: "count", name: "玉ねぎ", quantity: 2, unitLabel: "個" },
		];

		it.each([
			{ duplicateMode: "max", plan: "update", nextQuantity: 3 },
			{ duplicateMode: "sum", plan: "update", nextQuantity: 5 },
			{ duplicateMode: "skip", plan: "keep", nextQuantity: 2 },
		] as const)(
			"$duplicateMode：個の行（2個）を相手にする",
			({ duplicateMode, plan: expectedPlan, nextQuantity }) => {
				const rows = plan({
					needs: [need("玉ねぎ", 3, "個")],
					stockItems: stock,
					memoItems: twoRows,
					duplicateMode,
				});

				expect(rows[0]).toMatchObject({
					existing: { id: "count" },
					plan: expectedPlan,
					nextQuantity,
				});
			},
		);

		it("同じ単位の行がなければ、最初の行（単位が違うので、変えない）", () => {
			const rows = plan({
				needs: [need("玉ねぎ", 300, "g")],
				memoItems: twoRows,
				duplicateMode: "sum",
			});

			expect(rows[0]).toMatchObject({
				existing: { id: "bag" },
				plan: "keep",
				keepReason: "incomparable-unit",
			});
		});
	});
});

describe("planShoppingFromRecipe：冷凍野菜が代わりになる", () => {
	const frozenBroccoli = {
		name: "冷凍ブロッコリー",
		quantity: 300,
		stockUnitCode: "g" as const,
		stockUnitLabel: "g",
	};

	it("生の在庫がなくても、冷凍の在庫で足りれば、足りている（初期のチェックなし）", () => {
		const [row] = plan({
			needs: [need("ブロッコリー", 100, "g")],
			stockItems: [frozenBroccoli],
		});

		expect(row?.stock).toMatchObject({
			kind: "judged",
			judgment: { status: "enough" },
			standInName: "冷凍ブロッコリー",
		});
		expect(row?.defaultChecked).toBe(false);
	});

	it("冷凍の在庫でも足りないときは、不足のまま（チェックあり）", () => {
		const [row] = plan({
			needs: [need("ブロッコリー", 500, "g")],
			stockItems: [frozenBroccoli],
		});

		expect(row?.stock).toMatchObject({
			judgment: { status: "short" },
		});
		expect(row?.defaultChecked).toBe(true);
	});

	it("生の在庫で足りているときは、生の判定のまま", () => {
		const [row] = plan({
			needs: [need("ブロッコリー", 100, "g")],
			stockItems: [
				{
					name: "ブロッコリー",
					quantity: 500,
					stockUnitCode: "g",
					stockUnitLabel: "g",
				},
				frozenBroccoli,
			],
		});

		expect(row?.stock).not.toHaveProperty("standInName");
	});

	it("代わりにならない冷凍（フライドポテト）は、数えない", () => {
		const [row] = plan({
			needs: [need("じゃがいも", 1, "個")],
			stockItems: [
				{
					name: "冷凍ポテト(シューストリング)",
					quantity: 1000,
					stockUnitCode: "g",
					stockUnitLabel: "g",
				},
			],
		});

		expect(row?.defaultChecked).toBe(true);
	});

	it("形が決まっている冷凍（みじん切りの玉ねぎ）は、足りているとは判定せず、在庫があることだけ知らせる", () => {
		const [row] = plan({
			needs: [need("玉ねぎ", 1, "個")],
			stockItems: [
				{
					name: "冷凍玉ねぎ(みじん切り)",
					quantity: 300,
					stockUnitCode: "g",
					stockUnitLabel: "g",
				},
			],
		});

		expect(row?.stock).toMatchObject({
			judgment: { status: "short" },
			askStandIns: [{ name: "冷凍玉ねぎ(みじん切り)", quantity: 300 }],
		});
		expect(row?.stock).not.toHaveProperty("standInName");
		expect(row?.defaultChecked).toBe(true);
	});

	it("形が決まっている冷凍の量が足りなければ、在庫があるとも知らせない", () => {
		const [row] = plan({
			needs: [need("玉ねぎ", 2, "個")],
			stockItems: [
				{
					name: "冷凍玉ねぎ(みじん切り)",
					quantity: 300,
					stockUnitCode: "g",
					stockUnitLabel: "g",
				},
			],
		});

		expect(row?.stock).not.toHaveProperty("askStandIns");
		expect(row?.defaultChecked).toBe(true);
	});

	// [設定, 足りている（チェックなし）か, 知らせるか]
	const modeCases: [StandInMode, boolean, boolean][] = [
		["auto", true, false],
		["ask", false, true],
		["off", false, false],
	];

	it.each(modeCases)(
		"形が自由な冷凍で足りるとき、設定 %s では、足りている=%s・知らせる=%s",
		(standInMode, isEnough, isAsked) => {
			const [row] = plan({
				needs: [need("ブロッコリー", 100, "g")],
				stockItems: [frozenBroccoli],
				standInMode,
			});

			expect(row?.defaultChecked).toBe(!isEnough);
			expect(
				row?.stock.kind === "judged" && row.stock.askStandIns !== undefined,
			).toBe(isAsked);
		},
	);
});

describe("planShoppingFromRecipe：有無だけで管理している食材", () => {
	const oliveOil = {
		name: "オリーブオイル",
		quantity: 1,
		stockUnitCode: "ml" as const,
		stockUnitLabel: "ml",
		trackingMode: "presence" as const,
	};

	it("同じ食材の行が、量の有無にかかわらず、すべて足りている（チェックなし）", () => {
		const rows = plan({
			needs: [
				need("オリーブオイル", null, null, "a"),
				need("オリーブオイル", 2, "大さじ", "b"),
			],
			stockItems: [oliveOil],
		});

		expect(rows.map((row) => row.defaultChecked)).toEqual([false, false]);
		expect(rows.map((row) => row.stock)).toEqual([
			{ kind: "judged", judgment: { status: "enough", basis: "presence" } },
			{ kind: "judged", judgment: { status: "enough", basis: "presence" } },
		]);
	});

	it("量を追う管理の食材は、目印のような少ない量と比べて、足りなければ不足のまま", () => {
		const [row] = plan({
			needs: [need("オリーブオイル", 2, "大さじ")],
			stockItems: [{ ...oliveOil, trackingMode: "estimated" }],
		});

		expect(row?.stock).toMatchObject({ judgment: { status: "short" } });
		expect(row?.defaultChecked).toBe(true);
	});
});

describe("範囲の分量（60~70g）", () => {
	it("材料を展開するとき、範囲の下限と上限を読む（数量は null のまま）", () => {
		const [pork, salt] = flattenRecipeIngredients([
			{
				type: "ingredient",
				id: "1",
				status: "parsed",
				rawText: "豚こま肉 60~70g",
				name: "豚こま肉",
				amountText: "60~70g",
				quantity: null,
				unitLabel: "g",
			},
			{
				type: "ingredient",
				id: "2",
				status: "parsed",
				rawText: "塩 少々",
				name: "塩",
				amountText: "少々",
				quantity: null,
				unitLabel: null,
			},
		] as RecipeEditorIngredientNode[]);

		expect(pork).toMatchObject({ quantity: null, range: { min: 60, max: 70 } });
		expect(salt?.range).toBeUndefined();
	});

	it("買い物では、上限で在庫と比べ、足りない分を入れる（原文の分量は残す）", () => {
		const [row] = plan({
			needs: [
				withRangeUpperBound({
					...need("豚こま肉", null, "g"),
					amountText: "60~70g",
					range: { min: 60, max: 70 },
				}),
			],
			stockItems: [
				{
					name: "豚こま肉",
					quantity: 50,
					stockUnitCode: "g",
					stockUnitLabel: "g",
				},
			],
		});

		expect(row).toMatchObject({
			need: { amountText: "60~70g" },
			amount: { quantity: 20, unitLabel: "g" },
			defaultChecked: true,
		});
	});
});
