import { type ReactNode, useRef, useState } from "react";
import type { RecipeDetail } from "../application/recipe-repository";
import { RecipeLinkPreview } from "./recipe-link-preview";
import type { RecipeViewProps } from "./recipe-view";
import {
	type LoadLinkedRecipes,
	RecipeViewWithTree,
} from "./recipe-view-with-tree";

type RecipeViewWithLinksProps = Pick<
	RecipeViewProps,
	| "recipe"
	| "badges"
	| "actions"
	| "headerExtra"
	| "instructionsAction"
	| "ingredientsAction"
	| "madeAction"
	| "checklist"
	| "ratio"
	| "yieldControl"
> & {
	loadLinkedRecipe: (publicId: string) => Promise<RecipeDetail | null>;
	// wanted：開いた先で見せる、できあがりの数（リンク先の何回分かを、人数に直したもの。元の量なら、なし）。
	renderOpenLink: (publicId: string, wanted?: number) => ReactNode;
	// 材料のリンク先を、まとめて取ってくる（材料の下に、その場で開く）。
	loadLinkedRecipes?: LoadLinkedRecipes;
	// 画面の読み込みで、前もって取ったリンク先（材料の下と、プレビューの両方で使う）。
	preloadedLinkedRecipes?: Readonly<Record<string, RecipeDetail>>;
};

// 参照画面。本文のリンクを押すと、プレビューを開く（閉じると、押したリンクに、フォーカスが戻る）。
export function RecipeViewWithLinks({
	loadLinkedRecipe,
	renderOpenLink,
	loadLinkedRecipes,
	preloadedLinkedRecipes,
	...viewProps
}: RecipeViewWithLinksProps) {
	const [opened, setOpened] = useState<{
		publicId: string;
		ratio: number;
	} | null>(null);
	const triggerRef = useRef<HTMLElement | null>(null);

	return (
		<>
			<RecipeViewWithTree
				{...viewProps}
				loadLinkedRecipes={loadLinkedRecipes}
				preloadedLinkedRecipes={preloadedLinkedRecipes}
				onOpenLink={(publicId, trigger, ratio = 1) => {
					triggerRef.current = trigger;
					setOpened({ publicId, ratio });
				}}
			/>

			{opened !== null ? (
				<RecipeLinkPreview
					initialPublicId={opened.publicId}
					initialRatio={opened.ratio}
					loadRecipe={loadLinkedRecipe}
					renderOpenLink={renderOpenLink}
					loadLinkedRecipes={loadLinkedRecipes}
					preloadedRecipes={preloadedLinkedRecipes}
					onClose={() => {
						setOpened(null);
						triggerRef.current?.focus();
					}}
				/>
			) : null}
		</>
	);
}
