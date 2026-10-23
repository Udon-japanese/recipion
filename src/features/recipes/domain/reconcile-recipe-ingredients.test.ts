import { describe, expect, it } from "vitest";

import { formatIngredientText } from "./format-recipe-editor-text";
import { parseRecipeIngredients } from "./parse-recipe-ingredients";
import { createRecipeEditorDocument } from "./recipe-editor-document";
import {
	createIngredientSyncState,
	emptyIngredientSyncState,
	findGroupsConvertibleToIngredient,
	type IngredientSyncState,
	markGroupAsIngredient,
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

describe("グループと推定された行を、材料にする", () => {
	const text = "オリーブオイル\n塩 少々\nにんにく 1片";

	it("分量のない行から推定されたグループだけ、材料にできる", () => {
		const state = initialState(text);
		const group = state.nodes[0];

		expect(group.type).toBe("group");
		expect([...findGroupsConvertibleToIngredient(state)]).toEqual([group.id]);

		// 記号の印の行は、材料の名前として扱わない。
		expect(
			findGroupsConvertibleToIngredient(initialState("☆ソース\n塩 少々")).size,
		).toBe(0);
	});

	it("材料にすると、行が材料になり、中の材料は、前の ID のまま、グループ外に残る", () => {
		const state = initialState(text);
		const group = state.nodes[0];
		const childIds =
			group.type === "group" ? group.children.map((child) => child.id) : [];
		const marked = markGroupAsIngredient(state, group.id);

		expect(marked.plainLines).toEqual(["オリーブオイル"]);

		const result = reconcileRecipeIngredients(
			marked,
			parseRecipeIngredients(text, { plainLines: marked.plainLines }),
		);

		expect(result.nodes.map((node) => [node.type, node.name])).toEqual([
			["ingredient", "オリーブオイル"],
			["ingredient", "塩"],
			["ingredient", "にんにく"],
		]);
		expect(result.nodes.slice(1).map((node) => node.id)).toEqual(childIds);
		expect(result.plainLines).toEqual(["オリーブオイル"]);
	});

	it("材料にできないグループは、何も変えない", () => {
		const state = initialState("☆ソース\n塩 少々");

		expect(markGroupAsIngredient(state, state.nodes[0].id)).toBe(state);
	});
});
