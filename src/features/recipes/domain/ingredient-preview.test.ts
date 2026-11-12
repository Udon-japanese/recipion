import { describe, expect, it } from "vitest";
import { previewIngredients } from "./ingredient-preview";
import { createRecipeEditorDocument } from "./recipe-editor-document";

function ingredientsOf(ingredientText: string) {
	let sequence = 0;

	return createRecipeEditorDocument(
		{ name: "ためし", ingredientText },
		() => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`,
	).ingredients;
}

describe("previewIngredients", () => {
	it("グループの中も本文の順に数え、グループ名は入れず、リンクの括弧を外す", () => {
		const ingredients = ingredientsOf(
			"豚こま 200g\n★醤油 大さじ1\n★みりん 大さじ1\n[[自家製だし]] 100ml\nキャベツ 1/4個",
		);

		expect(previewIngredients(ingredients)).toEqual({
			names: ["豚こま", "醤油", "みりん", "自家製だし"],
			total: 5,
		});
	});

	it("材料がなければ、空", () => {
		expect(previewIngredients([])).toEqual({ names: [], total: 0 });
	});
});
