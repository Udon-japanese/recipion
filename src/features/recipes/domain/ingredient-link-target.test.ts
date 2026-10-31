import { describe, expect, it } from "vitest";
import { collectRecipeLinkTargetIds } from "./ingredient-link-target";
import type { RecipeEditorIngredientNode } from "./recipe-editor-document";

function ingredient(name: string): RecipeEditorIngredientNode {
	return {
		type: "ingredient",
		status: "missing-amount",
		id: name,
		name,
		rawText: name,
		amountText: null,
		quantity: null,
		unitLabel: null,
	};
}

describe("collectRecipeLinkTargetIds", () => {
	it("材料のリンクを先に、次に本文のリンクを、重ねずに集める。見つからないリンクと、自分自身は入れない", () => {
		expect(
			collectRecipeLinkTargetIds({
				publicId: "self",
				ingredients: [
					ingredient("[[たれ]]"),
					{
						type: "group",
						id: "g",
						name: "具",
						rawText: "具",
						inferred: false,
						children: [ingredient("[[だし]]")],
					},
				],
				linkViews: [
					{ label: "カレー", target: { publicId: "curry", name: "カレー" } },
					{ label: "たれ", target: { publicId: "sauce", name: "たれ" } },
					{ label: "だし", target: { publicId: "dashi", name: "だし" } },
					{ label: "消えた", target: null },
					{ label: "自分", target: { publicId: "self", name: "自分" } },
				],
			}),
		).toEqual(["sauce", "dashi", "curry"]);
	});
});
