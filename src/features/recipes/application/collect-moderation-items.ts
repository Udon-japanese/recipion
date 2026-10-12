import type { ModerationItem } from "#/features/moderation/domain/moderation-target";
import type {
	PreparedRecipeForStorage,
	StoredRecipeIngredientNode,
} from "./prepare-recipe-for-storage";

function describeIngredient(node: StoredRecipeIngredientNode): string {
	return node.amountText ? `${node.name} ${node.amountText}` : node.name;
}

// 公開しようとするレシピの、審査する文章（タイトル・材料・下準備・作り方・メモ・リンクの名前）。
export function collectRecipeModerationItems(
	recipe: PreparedRecipeForStorage,
): ModerationItem[] {
	return [
		{ target: "recipe-title", text: recipe.name },
		...recipe.ingredients.map(
			(node): ModerationItem => ({
				target: "recipe-ingredient",
				text: describeIngredient(node),
			}),
		),
		...recipe.preparations.map(
			(preparation): ModerationItem => ({
				target: "recipe-preparation",
				text: preparation.text,
			}),
		),
		...recipe.instructions.map(
			(instruction): ModerationItem => ({
				target: "recipe-instruction",
				text: instruction.text,
			}),
		),
		{ target: "recipe-note", text: recipe.note },
		...recipe.links.map(
			(link): ModerationItem => ({
				target: "recipe-link-label",
				text: link.label,
			}),
		),
	];
}
