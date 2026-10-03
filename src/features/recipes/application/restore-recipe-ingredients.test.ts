import { describe, expect, it } from "vitest";
import { createRecipeEditorDocument } from "../domain/recipe-editor-document";
import { prepareRecipeForStorage } from "./prepare-recipe-for-storage";
import { restoreRecipeIngredients } from "./restore-recipe-ingredients";

describe("restoreRecipeIngredients", () => {
	it("保存用に平坦化した材料を、元の木へ戻せる", () => {
		let sequence = 0;
		const document = createRecipeEditorDocument(
			{
				name: "つくね",
				ingredientText: "パスタ 150g\n塩\n小さじ1\n★卵 2個\n★牛乳 200ml",
			},
			() => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
		);

		const stored = prepareRecipeForStorage(document);

		// 取得順が保証されなくても、sortOrder で並ぶ
		const shuffled = [...stored.ingredients].reverse();

		expect(restoreRecipeIngredients(shuffled)).toEqual(document.ingredients);
	});

	it("親をたどれない材料があるときは、捨てずにエラーにする", () => {
		expect(() =>
			restoreRecipeIngredients([
				{
					id: "child",
					parentId: "missing-parent",
					sortOrder: 0,
					type: "ingredient",
					name: "卵",
					rawText: "卵 1個",
					inferred: null,
					status: "parsed",
					amountText: "1個",
					quantity: 1,
					unitLabel: "個",
				},
			]),
		).toThrow("親子関係");
	});
});
