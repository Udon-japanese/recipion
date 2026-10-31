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
	it("上限以内なら、null。ちょうど上限でも、null", () => {
		expect(findRecipeLimitViolation(document())).toBeNull();
		expect(
			findRecipeLimitViolation(
				document({ name: "あ".repeat(recipeLimits.nameMaxLength) }),
			),
		).toBeNull();
	});

	it.each([
		[
			"レシピ名",
			() => document({ name: "あ".repeat(101) }),
			"レシピ名は100文字まで",
		],
		[
			"材料の数",
			() =>
				document({ ingredientText: many(101, (i) => `食材${i} ${i + 1}個`) }),
			"材料は100件まで",
		],
		[
			"材料の名前",
			() => document({ ingredientText: `${"あ".repeat(101)} 1個` }),
			"材料の名前は100文字まで",
		],
		[
			"材料の分量",
			() => document({ ingredientText: `卵 ${"1".repeat(101)}個` }),
			"材料の分量は100文字まで",
		],
		[
			"下準備の数",
			() => document({ preparationText: many(51, (i) => `- 下準備${i}`) }),
			"下準備は50件まで",
		],
		[
			"下準備の長さ",
			() => document({ preparationText: `- ${"あ".repeat(1001)}` }),
			"下準備の1件は1,000文字まで",
		],
		[
			"作り方の数",
			() => document({ instructionText: many(51, (i) => `${i + 1}. 手順`) }),
			"作り方は50件まで",
		],
		[
			"作り方の長さ",
			() => document({ instructionText: `1. ${"あ".repeat(1001)}` }),
			"作り方の1つの工程は1,000文字まで",
		],
		[
			"メモの長さ",
			() => document({ note: "あ".repeat(3001) }),
			"メモは3,000文字まで",
		],
	])("%s が上限を超えたら、具体的な文を返す", (_name, create, expected) => {
		expect(findRecipeLimitViolation(create())).toContain(expected);
	});

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
