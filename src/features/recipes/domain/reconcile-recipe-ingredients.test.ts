import { describe, expect, it } from "vitest";

import { formatIngredientText } from "./format-recipe-editor-text";
import { parseRecipeIngredients } from "./parse-recipe-ingredients";
import { createRecipeEditorDocument } from "./recipe-editor-document";
import {
	createIngredientSyncState,
	emptyIngredientSyncState,
	type IngredientSyncState,
	reconcileRecipeIngredients,
} from "./reconcile-recipe-ingredients";

function createIdFactory() {
	let count = 0;

	return () => `id-${++count}`;
}

function initialState(
	text: string,
	createId = createIdFactory(),
): IngredientSyncState {
	return reconcileRecipeIngredients(
		emptyIngredientSyncState,
		parseRecipeIngredients(text),
		createId,
	);
}

describe("reconcileRecipeIngredients", () => {
	it("同じ文章なら、ID も内容も変わらない", () => {
		const text = "卵 1個\n☆ソース\nケチャップ 大さじ2";
		const first = initialState(text);
		const second = reconcileRecipeIngredients(
			first,
			parseRecipeIngredients(text),
		);

		expect(second.nodes).toEqual(first.nodes);
	});

	it("元の行が変わっていない材料は、手直しを引き継ぐ", () => {
		const first = initialState("卵 1個\n牛乳 200ml");
		const [egg] = first.nodes;
		const edited: IngredientSyncState = {
			...first,
			nodes: [
				{ ...egg, name: "たまご", amountText: "2個", rawText: "たまご 2個" },
				first.nodes[1],
			] as IngredientSyncState["nodes"],
			edited: new Set([egg.id]),
		};

		const result = reconcileRecipeIngredients(
			edited,
			parseRecipeIngredients("卵 1個\n牛乳 300ml"),
		);

		expect(result.nodes[0]).toMatchObject({
			id: egg.id,
			name: "たまご",
			amountText: "2個",
		});
		expect(result.nodes[1]).toMatchObject({ amountText: "300ml" });
		expect(result.edited.has(egg.id)).toBe(true);
	});

	it("元の行を書き換えた材料は、解析し直す", () => {
		const first = initialState("卵 1個");
		const [egg] = first.nodes;
		const edited: IngredientSyncState = {
			...first,
			nodes: [{ ...egg, name: "たまご" }] as IngredientSyncState["nodes"],
			edited: new Set([egg.id]),
		};

		const result = reconcileRecipeIngredients(
			edited,
			parseRecipeIngredients("卵 3個"),
		);

		expect(result.nodes[0]).toMatchObject({ name: "卵", amountText: "3個" });
		expect(result.nodes[0].id).not.toBe(egg.id);
	});

	it("プレビューで追加した材料とグループを残す", () => {
		const first = initialState("卵 1個");
		const withAdded: IngredientSyncState = {
			...first,
			nodes: [
				...first.nodes,
				{
					type: "group",
					id: "added-group",
					name: "トッピング",
					rawText: "トッピング",
					inferred: false,
					children: [
						{
							type: "ingredient",
							status: "missing-amount",
							id: "added-item",
							name: "海苔",
							rawText: "海苔",
							amountText: null,
							quantity: null,
							unitLabel: null,
						},
					],
				},
			],
		};

		const result = reconcileRecipeIngredients(
			withAdded,
			parseRecipeIngredients("卵 1個\n牛乳 200ml"),
		);

		expect(result.nodes.map((node) => node.name)).toEqual([
			"卵",
			"牛乳",
			"トッピング",
		]);
		expect(result.nodes[2]).toMatchObject({
			id: "added-group",
			children: [expect.objectContaining({ id: "added-item" })],
		});
	});

	it("プレビューで別のグループへ動かした材料を、動かした先に残す", () => {
		const first = initialState("卵 1個\n☆ソース\nケチャップ 大さじ2");
		const [egg, sauce] = first.nodes;

		if (sauce.type !== "group") {
			throw new Error("グループのはず");
		}

		const moved: IngredientSyncState = {
			...first,
			nodes: [{ ...sauce, children: [...sauce.children, egg] }],
			edited: new Set([egg.id]),
		};

		const result = reconcileRecipeIngredients(
			moved,
			parseRecipeIngredients("卵 1個\n☆ソース\nケチャップ 大さじ2"),
		);

		expect(result.nodes).toHaveLength(1);
		expect(result.nodes[0]).toMatchObject({
			type: "group",
			children: [
				expect.objectContaining({ name: "ケチャップ" }),
				expect.objectContaining({ id: egg.id }),
			],
		});
	});

	it("プレビューで名前を変えたグループの名前を残す", () => {
		const first = initialState("☆ソース\nケチャップ 大さじ2");
		const [sauce] = first.nodes;
		const renamed: IngredientSyncState = {
			...first,
			nodes: [{ ...sauce, name: "たれ", rawText: "たれ" }],
			edited: new Set([sauce.id]),
		};

		const result = reconcileRecipeIngredients(
			renamed,
			parseRecipeIngredients("☆ソース\nケチャップ 大さじ2\nみりん 大さじ1"),
		);

		expect(result.nodes[0]).toMatchObject({ id: sauce.id, name: "たれ" });
	});

	it("元の行を消した材料は、消える", () => {
		const first = initialState("卵 1個\n牛乳 200ml");
		const result = reconcileRecipeIngredients(
			first,
			parseRecipeIngredients("卵 1個"),
		);

		expect(result.nodes.map((node) => node.name)).toEqual(["卵"]);
	});

	it("プレビューで消した行は、文章に残っていても、出さない", () => {
		const text = "卵 1個\n牛乳 200ml";
		const first = initialState(text);
		const withDismissed: IngredientSyncState = {
			...first,
			nodes: first.nodes.slice(1),
			dismissed: ["卵 1個"],
		};

		const result = reconcileRecipeIngredients(
			withDismissed,
			parseRecipeIngredients(text),
		);

		expect(result.nodes.map((node) => node.name)).toEqual(["牛乳"]);
		expect(result.dismissed).toEqual(["卵 1個"]);

		// 元の行を書き換えると、消した記録は、役目を終える。
		const rewritten = reconcileRecipeIngredients(
			result,
			parseRecipeIngredients("卵 2個\n牛乳 200ml"),
		);

		expect(rewritten.nodes.map((node) => node.name)).toEqual(["卵", "牛乳"]);
		expect(rewritten.dismissed).toEqual([]);
	});

	it("消したグループの材料は、グループ外に出る", () => {
		const text = "☆ソース\nケチャップ 大さじ2";
		const first = initialState(text);

		const result = reconcileRecipeIngredients(
			{ ...first, nodes: [], dismissed: ["☆ソース", "ケチャップ 大さじ2"] },
			parseRecipeIngredients(text),
		);

		expect(result.nodes).toEqual([]);
	});
});

describe("createIngredientSyncState", () => {
	it("保存済みの材料を、同じ文章に書き戻すと、ID も内容も変わらない", () => {
		const document = createRecipeEditorDocument({
			ingredientText: "卵 1個\n☆ソース\nケチャップ 大さじ2",
		});
		const state = createIngredientSyncState(document.ingredients);
		const text = formatIngredientText(document.ingredients);

		expect(
			reconcileRecipeIngredients(state, parseRecipeIngredients(text)).nodes,
		).toEqual(document.ingredients);
	});

	it("解析し直すと変わってしまう分量は、保存済みの内容を守る", () => {
		const document = createRecipeEditorDocument({ ingredientText: "卵 1個" });
		const [egg] = document.ingredients;
		const freeForm = {
			...egg,
			amountText: "お好みの量",
			rawText: "卵 お好みの量",
		} as typeof egg;
		const state = createIngredientSyncState([freeForm]);
		const text = formatIngredientText([freeForm]);

		expect(state.edited.has(freeForm.id)).toBe(true);
		expect(
			reconcileRecipeIngredients(state, parseRecipeIngredients(text)).nodes[0],
		).toMatchObject({ amountText: "お好みの量" });
	});
});
