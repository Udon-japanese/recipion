import type { RecipeEditorIngredientNode } from "./recipe-editor-document";
import { stripLinkBrackets } from "./recipe-links";

// 一覧のカードで、材料を少しだけ見せる（本文の順。グループの中も、その位置で数える）。
export type IngredientPreview = {
	// 先頭からの材料名（リンクの [[ ]] は外す）。
	names: string[];
	// 材料の数（グループは数えない）。names より多ければ「ほか n 品」。
	total: number;
};

export const ingredientPreviewLimit = 4;

export function previewIngredients(
	nodes: readonly RecipeEditorIngredientNode[],
	limit = ingredientPreviewLimit,
): IngredientPreview {
	const names: string[] = [];

	function collect(list: readonly RecipeEditorIngredientNode[]) {
		for (const node of list) {
			if (node.type === "group") {
				collect(node.children);
				continue;
			}

			const name = stripLinkBrackets(node.name).trim();

			if (name !== "") {
				names.push(name);
			}
		}
	}

	collect(nodes);

	return { names: names.slice(0, limit), total: names.length };
}
