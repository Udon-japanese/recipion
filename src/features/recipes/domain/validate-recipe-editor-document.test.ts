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

	it("引用元URLは未入力か、http(s)のURLだけを受け付ける", () => {
		const document = createDocument();

		expect(validateRecipeEditorDocument(document).sourceUrl).toBeNull();
		expect(
			validateRecipeEditorDocument({
				...document,
				sourceUrl: "https://example.com/recipe/1",
			}).sourceUrl,
		).toBe("https://example.com/recipe/1");

		for (const sourceUrl of [
			"javascript:alert(1)",
			"ftp://example.com/recipe",
			"example.com/recipe",
		]) {
			expect(() =>
				validateRecipeEditorDocument({ ...document, sourceUrl }),
			).toThrow("レシピの入力内容を確認してください");
		}
	});

	it("公開範囲は、省略すると private。知らない値は拒否。引用元のあるレシピは公開できない", () => {
		const document = createDocument();
		const { visibility: _visibility, ...withoutVisibility } = document;

		expect(validateRecipeEditorDocument(withoutVisibility).visibility).toBe(
			"private",
		);
		expect(
			validateRecipeEditorDocument({ ...document, visibility: "public" })
				.visibility,
		).toBe("public");
		expect(() =>
			validateRecipeEditorDocument({ ...document, visibility: "everyone" }),
		).toThrow("レシピの入力内容を確認してください");
		expect(() =>
			validateRecipeEditorDocument({
				...document,
				visibility: "public",
				sourceUrl: "https://example.com/recipe/1",
			}),
		).toThrow("引用元のURLがあるレシピは、公開できません");
		// 非公開なら、引用元があってよい。
		expect(
			validateRecipeEditorDocument({
				...document,
				sourceUrl: "https://example.com/recipe/1",
			}).visibility,
		).toBe("private");
	});

	it("入力の上限を超えたら、具体的な文で拒否する（レシピ名・メモ・全体）", () => {
		const document = createDocument();

		expect(() =>
			validateRecipeEditorDocument({ ...document, name: "あ".repeat(101) }),
		).toThrow("レシピ名は、100文字までです。");
		expect(() =>
			validateRecipeEditorDocument({ ...document, note: "あ".repeat(3001) }),
		).toThrow("メモは、3,000文字までです。");
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

	it("リンクは、使えるラベルと、リンク先のIDを確認する", () => {
		const document = createDocument();
		const link = { label: "カレー", targetPublicId: "abc123" };

		expect(
			validateRecipeEditorDocument({ ...document, links: [link] }).links,
		).toEqual([link]);

		for (const invalid of [
			{ label: "", targetPublicId: "abc123" },
			{ label: " カレー", targetPublicId: "abc123" },
			{ label: "a]b", targetPublicId: "abc123" },
			{ label: "カレー", targetPublicId: "" },
		]) {
			expect(() =>
				validateRecipeEditorDocument({ ...document, links: [invalid] }),
			).toThrow("レシピの入力内容を確認してください");
		}
	});

	it("同じラベルのリンクを、二度使えない", () => {
		const document = createDocument();

		expect(() =>
			validateRecipeEditorDocument({
				...document,
				links: [
					{ label: "カレー", targetPublicId: "a" },
					{ label: "カレー", targetPublicId: "b" },
				],
			}),
		).toThrow("リンクのラベルが重複しています");
	});

	it("古い画面から、リンクのない形で保存しても、受け付ける（リンクなしとして扱う）", () => {
		const { links: _links, ...withoutLinks } = createDocument();

		expect(validateRecipeEditorDocument(withoutLinks).links).toEqual([]);
	});
});
