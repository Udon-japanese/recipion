import { describe, expect, it } from "vitest";
import { createRecipeEditorDocument } from "./recipe-editor-document";
import { validateRecipeEditorDocument } from "./validate-recipe-editor-document";

function createDocument() {
	return createRecipeEditorDocument({
		name: "卵焼き",
		ingredientText: "卵 2個",
		instructionText: "1. 卵を溶く\n2. 焼く",
	});
}

describe("validateRecipeEditorDocument", () => {
	it("正しいレシピを受け取る", () => {
		const document = createDocument();

		expect(validateRecipeEditorDocument(document)).toStrictEqual(document);
	});

	it("名前と人数を確認する", () => {
		const document = createDocument();

		expect(() =>
			validateRecipeEditorDocument({ ...document, name: "　" }),
		).toThrow("レシピの入力内容を確認してください");

		expect(() =>
			validateRecipeEditorDocument({ ...document, servings: 0 }),
		).toThrow("レシピの入力内容を確認してください");
	});

	it("同じIDを二度使用できない", () => {
		const document = createDocument();

		document.instructions[0].id = document.ingredients[0].id;

		expect(() => validateRecipeEditorDocument(document)).toThrow(
			"レシピ内でIDが重複しています",
		);
	});

	it("工程は前の工程だけを参照できる", () => {
		const document = createDocument();

		document.instructions[0].referencedInstructionIds = [
			document.instructions[1].id,
		];

		expect(() => validateRecipeEditorDocument(document)).toThrow(
			"前の工程だけを参照してください",
		);

		document.instructions[0].referencedInstructionIds = [];
		document.instructions[1].referencedInstructionIds = [
			document.instructions[0].id,
		];

		expect(validateRecipeEditorDocument(document)).toStrictEqual(document);
	});

	it("数量のない材料も保持する", () => {
		const document = createRecipeEditorDocument({
			name: "下味",
			ingredientText: "塩",
		});

		expect(validateRecipeEditorDocument(document)).toStrictEqual(document);
	});

	it("材料の数量や解析状態が壊れていたら拒否する", () => {
		const document = createDocument();
		const ingredient = document.ingredients[0];

		if (ingredient?.type !== "ingredient") {
			throw new Error("材料が作成されていません");
		}

		expect(() =>
			validateRecipeEditorDocument({
				...document,
				ingredients: [{ ...ingredient, quantity: -2 }],
			}),
		).toThrow("レシピの入力内容を確認してください");

		expect(() =>
			validateRecipeEditorDocument({
				...document,
				ingredients: [
					{
						...ingredient,
						status: "missing-amount",
						amountText: null,
						quantity: 2,
						unitLabel: null,
					},
				],
			}),
		).toThrow("レシピの入力内容を確認してください");
	});

	it("検証済みの値を返し、余分な項目を保存処理へ渡さない", () => {
		const document = createDocument();

		const result = validateRecipeEditorDocument({
			...document,
			name: "  卵焼き  ",
			unexpected: "保存しない",
		});

		expect(result.name).toBe("卵焼き");
		expect(result).not.toHaveProperty("unexpected");
	});
});
