import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { ButtonLink } from "#/components/button/button-link";
import { pageTitle } from "#/config/app";
import { IngredientDictionaryProvider } from "#/features/ingredients/components/ingredient-dictionary-context";
import { useIngredientDictionary } from "#/features/ingredients/hooks/use-ingredient-dictionary";
import { useOwnerScope } from "#/features/inventory/hooks/use-owner-scope";
import { RecipeEditor } from "#/features/recipes/components/recipe-editor";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { collectRecipeLinkTargetIds } from "#/features/recipes/domain/ingredient-link-target";
import { getLinkedRecipesServerFn } from "#/features/recipes/server/get-linked-recipes";
import { getRecipeServerFn } from "#/features/recipes/server/get-recipe";
import {
	listUserPublicRecipesServerFn,
	searchLinkableUsersServerFn,
} from "#/features/recipes/server/linkable-recipes";
import { listRecipesServerFn } from "#/features/recipes/server/list-recipes";
import { loadRecipe } from "#/features/recipes/server/load-recipe";
import { updateRecipeServerFn } from "#/features/recipes/server/update-recipe";

// 保存前の確認で押したリンクのプレビュー。編集中の内容を失わないよう、「レシピを開く」は、新しいタブで開く。
function loadLinkedRecipe(publicId: string) {
	return getRecipeServerFn({ data: { publicId } });
}

function loadLinkedRecipes(publicIds: string[]) {
	return getLinkedRecipesServerFn({ data: { publicIds } });
}

function renderOpenLink(publicId: string) {
	return (
		<ButtonLink
			to="/recipes/$publicId"
			params={{ publicId }}
			target="_blank"
			rel="noreferrer"
			variant="secondary"
			size="sm"
		>
			レシピを開く
		</ButtonLink>
	);
}

// 前もって取るリンク先の数の上限（getLinkedRecipesServerFn の入力の上限と同じ）。
const maxPreloadedLinkTargets = 30;

// リンクできるレシピ（自分のレシピ）。編集中のレシピ自身には、リンクできない。
async function loadLinkTargets(editingPublicId: string) {
	const recipes = await listRecipesServerFn();

	return recipes
		.filter((candidate) => candidate.publicId !== editingPublicId)
		.map(({ publicId, name, createdAt }) => ({ publicId, name, createdAt }));
}

export const Route = createFileRoute("/recipes/$publicId/edit")({
	// ブラウザ専用の処理が多い重い画面なので、サーバーでは描画しない（loader も、ブラウザで実行される）。
	ssr: false,
	// リンクできるレシピと、保存済みの本文のリンク先も、前もって取る（保存前の確認のプレビューで、すぐに出す）。
	loader: async ({ params }) => {
		const { recipe, revision } = await loadRecipe(params.publicId);
		const linkTargetIds = collectRecipeLinkTargetIds(recipe).slice(
			0,
			maxPreloadedLinkTargets,
		);
		const [linkTargets, linkedRecipes] = await Promise.all([
			loadLinkTargets(recipe.publicId),
			linkTargetIds.length > 0
				? getLinkedRecipesServerFn({ data: { publicIds: linkTargetIds } })
				: {},
		]);

		return { recipe, revision, linkTargets, linkedRecipes };
	},
	head: ({ loaderData }) => ({
		meta: [
			{
				title: pageTitle(
					loaderData ? `${loaderData.recipe.name}を編集` : "レシピを編集",
				),
			},
		],
	}),
	errorComponent: RecipeRouteError,
	notFoundComponent: RecipeNotFound,
	component: EditRecipePage,
});

function RecipeNotFound() {
	return (
		<>
			<p>レシピが見つかりません。</p>
			<Link to="/recipes">レシピ一覧へ</Link>
		</>
	);
}

function EditRecipePage() {
	const { recipe, revision, linkTargets, linkedRecipes } =
		Route.useLoaderData();
	const navigate = useNavigate();
	// 自分の食材辞書（本文の材料の補完に、自分の材料も出す）。
	const dictionary = useIngredientDictionary(useOwnerScope());
	// 保存のたびに、新しい版に進める（保存に失敗して、この画面に残ったときも、次の保存で確かめられるように）。
	const revisionRef = useRef(revision);

	return (
		<IngredientDictionaryProvider value={dictionary}>
			<RecipeEditor
				initialDocument={recipe}
				publicId={recipe.publicId}
				loadLinkedRecipe={loadLinkedRecipe}
				renderOpenLink={renderOpenLink}
				loadLinkedRecipes={loadLinkedRecipes}
				searchLinkableUsers={(query) =>
					searchLinkableUsersServerFn({ data: { query } })
				}
				loadUserRecipes={(handle) =>
					listUserPublicRecipesServerFn({ data: { handle } })
				}
				loadLinkTargets={() => loadLinkTargets(recipe.publicId)}
				initialLinkTargets={linkTargets}
				preloadedLinkedRecipes={linkedRecipes}
				missingLinkLabels={recipe.linkViews.flatMap((view) =>
					view.target ? [] : [view.label],
				)}
				onSave={async (document, { overwrite }) => {
					const saved = await updateRecipeServerFn({
						data: {
							publicId: recipe.publicId,
							document,
							expectedRevision: overwrite ? null : revisionRef.current,
						},
					});

					revisionRef.current = saved.revision;

					return saved;
				}}
				onSaved={() =>
					void navigate({
						to: "/recipes/$publicId",
						params: { publicId: recipe.publicId },
					})
				}
			/>
		</IngredientDictionaryProvider>
	);
}
