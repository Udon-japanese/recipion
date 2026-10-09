import { type ReactNode, useRef, useState } from "react";
import type { RecipeDetail } from "../application/recipe-repository";
import { RecipeLinkPreview } from "./recipe-link-preview";
import {
	type LoadLinkedRecipes,
	RecipeViewWithTree,
} from "./recipe-view-with-tree";

type RecipeViewWithLinksProps = {
	recipe: RecipeDetail;
	loadLinkedRecipe: (publicId: string) => Promise<RecipeDetail | null>;
	renderOpenLink: (publicId: string) => ReactNode;
	// 材料のリンク先を、まとめて取ってくる（材料の下に、その場で開く）。
	loadLinkedRecipes?: LoadLinkedRecipes;
};

// 参照画面。本文のリンクを押すと、プレビューを開く（閉じると、押したリンクに、フォーカスが戻る）。
export function RecipeViewWithLinks({
	recipe,
	loadLinkedRecipe,
	renderOpenLink,
	loadLinkedRecipes,
}: RecipeViewWithLinksProps) {
	const [openedPublicId, setOpenedPublicId] = useState<string | null>(null);
	const triggerRef = useRef<HTMLElement | null>(null);

	return (
		<>
			<RecipeViewWithTree
				recipe={recipe}
				loadLinkedRecipes={loadLinkedRecipes}
				onOpenLink={(publicId, trigger) => {
					triggerRef.current = trigger;
					setOpenedPublicId(publicId);
				}}
			/>

			{openedPublicId !== null ? (
				<RecipeLinkPreview
					initialPublicId={openedPublicId}
					loadRecipe={loadLinkedRecipe}
					renderOpenLink={renderOpenLink}
					onClose={() => {
						setOpenedPublicId(null);
						triggerRef.current?.focus();
					}}
				/>
			) : null}
		</>
	);
}
