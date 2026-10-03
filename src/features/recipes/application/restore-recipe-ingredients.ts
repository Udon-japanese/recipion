import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import type { StoredRecipeIngredientNode } from "./prepare-recipe-for-storage";

// prepareRecipeForStorage の逆。parentId と sortOrder の平坦な形から、グループが children を持つ木へ戻す。
export function restoreRecipeIngredients(
	storedNodes: readonly StoredRecipeIngredientNode[],
): RecipeEditorIngredientNode[] {
	const childrenByParentId = new Map<
		string | null,
		StoredRecipeIngredientNode[]
	>();

	for (const stored of storedNodes) {
		const siblings = childrenByParentId.get(stored.parentId) ?? [];
		siblings.push(stored);
		childrenByParentId.set(stored.parentId, siblings);
	}

	let restoredCount = 0;

	function restore(parentId: string | null): RecipeEditorIngredientNode[] {
		const siblings = [...(childrenByParentId.get(parentId) ?? [])].sort(
			(a, b) => a.sortOrder - b.sortOrder,
		);

		return siblings.map((stored): RecipeEditorIngredientNode => {
			restoredCount += 1;

			if (stored.type === "group") {
				if (stored.inferred === null) {
					throw new Error("保存された材料グループの形式が正しくありません");
				}

				return {
					type: "group",
					id: stored.id,
					name: stored.name,
					rawText: stored.rawText,
					inferred: stored.inferred,
					children: restore(stored.id),
				};
			}

			if (stored.status === "parsed" && stored.amountText !== null) {
				return {
					type: "ingredient",
					status: "parsed",
					id: stored.id,
					name: stored.name,
					rawText: stored.rawText,
					amountText: stored.amountText,
					quantity: stored.quantity,
					unitLabel: stored.unitLabel,
				};
			}

			if (stored.status === "missing-amount") {
				return {
					type: "ingredient",
					status: "missing-amount",
					id: stored.id,
					name: stored.name,
					rawText: stored.rawText,
					amountText: null,
					quantity: null,
					unitLabel: null,
				};
			}

			throw new Error("保存された材料の形式が正しくありません");
		});
	}

	const roots = restore(null);

	// 親をたどれない材料（親が存在しない、循環している）は表示できないので、黙って捨てない。
	if (restoredCount !== storedNodes.length) {
		throw new Error("保存された材料の親子関係が正しくありません");
	}

	return roots;
}
