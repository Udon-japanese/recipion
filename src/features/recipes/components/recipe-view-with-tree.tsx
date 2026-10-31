import { useEffect, useState } from "react";
import type { RecipeDetail } from "../application/recipe-repository";
import { collectIngredientLinkTargetIds } from "../domain/ingredient-link-target";
import { RecipeView, type RecipeViewProps } from "./recipe-view";

export type LoadLinkedRecipes = (
	publicIds: string[],
) => Promise<Record<string, RecipeDetail>>;

type RecipeViewWithTreeProps = Omit<RecipeViewProps, "linkedRecipes"> & {
	// 材料のリンク先のレシピを、まとめて取ってくる。なければ、リンクは、押すとプレビューが開くだけ。
	loadLinkedRecipes?: LoadLinkedRecipes;
};

// 材料のリンク先を取ってきて、材料の下に、その場で開く（取れるまでは、リンクのまま）。
export function RecipeViewWithTree({
	loadLinkedRecipes,
	...viewProps
}: RecipeViewWithTreeProps) {
	const { recipe } = viewProps;
	const [loaded, setLoaded] = useState<{
		forPublicId: string;
		recipes: Record<string, RecipeDetail>;
	} | null>(null);

	useEffect(() => {
		const targetIds = collectIngredientLinkTargetIds(
			recipe.ingredients,
			recipe.linkViews,
		);

		if (!loadLinkedRecipes || targetIds.length === 0) {
			return;
		}

		let isCancelled = false;

		loadLinkedRecipes(targetIds)
			.then((recipes) => {
				if (!isCancelled) {
					setLoaded({ forPublicId: recipe.publicId, recipes });
				}
			})
			// 取れなかったときは、リンクのまま（押すと、プレビューが開く）。
			.catch(() => {});

		return () => {
			isCancelled = true;
		};
	}, [recipe, loadLinkedRecipes]);

	return (
		<RecipeView
			{...viewProps}
			linkedRecipes={
				loaded?.forPublicId === recipe.publicId ? loaded.recipes : undefined
			}
		/>
	);
}
