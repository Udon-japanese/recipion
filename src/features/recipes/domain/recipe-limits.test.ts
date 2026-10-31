import { describe, expect, it } from "vitest";
import { createRecipeEditorDocument } from "./recipe-editor-document";
import {
	findRecipeCountViolation,
	findRecipeLimitViolation,
	recipeLimits,
} from "./recipe-limits";

function document(
	overrides: Parameters<typeof createRecipeEditorDocument>[0] = {},
) {
	return createRecipeEditorDocument({
		name: "卵焼き",
		ingredientText: "卵 2個",
		instructionText: "1. 焼く",
		...overrides,
	});
}

const many = (count: number, line: (index: number) => string) =>
	Array.from({ length: count }, (_, index) => line(index)).join("\n");

describe("findRecipeLimitViolation", () => {
	it("ふつうのレシピは、null", () => {
		expect(findRecipeLimitViolation(document())).toBeNull();
	});

	// 欄ごとに、上限ちょうど（通る）と、上限＋1（止まる）を確かめる。上限は、定数から作る。
	it.each([
		[
			"レシピ名",
			recipeLimits.nameMaxLength,
			(n: number) => document({ name: "あ".repeat(n) }),
			"レシピ名は100文字まで",
		],
		[
			"材料の数",
			recipeLimits.maxIngredients,
			(n: number) =>
				document({ ingredientText: many(n, (i) => `食材${i} ${i + 1}個`) }),
			"材料は100件まで",
		],
		[
			"材料の名前",
			recipeLimits.ingredientNameMaxLength,
			(n: number) => document({ ingredientText: `${"あ".repeat(n)} 1個` }),
			"材料の名前は100文字まで",
		],
		[
			"材料の分量",
			recipeLimits.ingredientAmountMaxLength,
			// 「1…1個」：数字 n-1 個と単位で、分量が n 文字。
			(n: number) => document({ ingredientText: `卵 ${"1".repeat(n - 1)}個` }),
			"材料の分量は100文字まで",
		],
		[
			"下準備の数",
			recipeLimits.maxPreparations,
			(n: number) =>
				document({ preparationText: many(n, (i) => `- 下準備${i}`) }),
			"下準備は50件まで",
		],
		[
			"下準備の長さ",
			recipeLimits.preparationMaxLength,
			(n: number) => document({ preparationText: `- ${"あ".repeat(n)}` }),
			"下準備の1件は1,000文字まで",
		],
		[
			"作り方の数",
			recipeLimits.maxInstructions,
			(n: number) =>
				document({ instructionText: many(n, (i) => `${i + 1}. 手順`) }),
			"作り方は50件まで",
		],
		[
			"作り方の長さ",
			recipeLimits.instructionMaxLength,
			(n: number) => document({ instructionText: `1. ${"あ".repeat(n)}` }),
			"作り方の1つの工程は1,000文字まで",
		],
		[
			"メモの長さ",
			recipeLimits.noteMaxLength,
			(n: number) => document({ note: "あ".repeat(n) }),
			"メモは3,000文字まで",
		],
	])(
		"%s：上限ちょうど（%i）は通り、上限＋1 は、具体的な文を返す",
		(_name, limit, create, expected) => {
			expect(findRecipeLimitViolation(create(limit))).toBeNull();
			expect(findRecipeLimitViolation(create(limit + 1))).toContain(expected);
		},
	);

	it("全体の文字数が上限を超えたら、いまの文字数を添えて返す", () => {
		// 1つ1つは上限以内でも、合計で超える（作り方を、1,000文字×13）。
		const violation = findRecipeLimitViolation(
			document({
				instructionText: many(13, (i) => `${i + 1}. ${"あ".repeat(990)}`),
			}),
		);

		expect(violation).toContain("レシピ全体で12,000文字まで");
		expect(violation).toMatch(/いま1[2-3],\d{3}文字/u);
	});
});

describe("findRecipeCountViolation", () => {
	it("1人あたりの件数の上限に達していたら、文を返す", () => {
		expect(findRecipeCountViolation(0)).toBeNull();
		expect(
			findRecipeCountViolation(recipeLimits.maxRecipesPerUser - 1),
		).toBeNull();
		expect(findRecipeCountViolation(recipeLimits.maxRecipesPerUser)).toContain(
			"300件まで",
		);
	});
});
