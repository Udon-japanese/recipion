import { describe, expect, it } from "vitest";
import { createRecipeEditorDocument } from "../domain/recipe-editor-document";
import { collectRecipeModerationItems } from "./collect-moderation-items";
import { prepareRecipeForStorage } from "./prepare-recipe-for-storage";

describe("collectRecipeModerationItems", () => {
	it("タイトル・材料（分量つき）・下準備・作り方・メモ・リンクの名前を、欄ごとに集める", () => {
		const recipe = prepareRecipeForStorage({
			...createRecipeEditorDocument({
				name: "卵焼き",
				ingredientText: "卵 2個",
				preparationText: "- 卵を室温に戻す",
				instructionText: "1. 卵を溶く",
				note: "ふんわり",
			}),
			links: [],
		});

		expect(collectRecipeModerationItems(recipe)).toEqual([
			{ target: "recipe-title", text: "卵焼き" },
			{ target: "recipe-ingredient", text: "卵 2個" },
			{ target: "recipe-preparation", text: "卵を室温に戻す" },
			{ target: "recipe-instruction", text: "卵を溶く" },
			{ target: "recipe-note", text: "ふんわり" },
		]);
	});
});
