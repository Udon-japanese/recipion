import type { RecipeEditorIngredientNode } from "./recipe-editor-document";
import { type RecipeLinkView, splitTextByLinks } from "./recipe-links";

// 材料の名前が [[ラベル]] だけで、リンク先が見つかるとき、そのレシピ（その場で開いて表示するリンク）。
export function findIngredientLinkTarget(
	name: string,
	linkViews: readonly RecipeLinkView[],
): { publicId: string; name: string } | null {
	const segments = splitTextByLinks(name);
	const [only] = segments;

	if (segments.length !== 1 || only?.type !== "link") {
		return null;
	}

	return linkViews.find((view) => view.label === only.label)?.target ?? null;
}

// 材料（グループの中も）から、その場で開くリンク先のレシピの ID を集める。
export function collectIngredientLinkTargetIds(
	nodes: readonly RecipeEditorIngredientNode[],
	linkViews: readonly RecipeLinkView[],
): string[] {
	return nodes.flatMap((node) => {
		if (node.type === "group") {
			return collectIngredientLinkTargetIds(node.children, linkViews);
		}

		const target = findIngredientLinkTarget(node.name, linkViews);

		return target ? [target.publicId] : [];
	});
}
