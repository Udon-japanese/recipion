import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { RecipeEditor } from "#/features/recipes/components/recipe-editor";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
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
		<Link
			to="/recipes/$publicId"
			params={{ publicId }}
			target="_blank"
			rel="noreferrer"
		>
			レシピを開く
		</Link>
	);
}

export const Route = createFileRoute("/recipes/$publicId/edit")({
	// ブラウザ専用の処理が多い重い画面なので、サーバーでは描画しない（loader も、ブラウザで実行される）。
	ssr: false,
	loader: ({ params }) => loadRecipe(params.publicId),
	head: ({ loaderData }) => ({
		meta: [
			{
				title: pageTitle(
					loaderData ? `${loaderData.name}を編集` : "レシピを編集",
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
	const recipe = Route.useLoaderData();
	const navigate = useNavigate();

	return (
		<RecipeEditor
			initialDocument={recipe}
			loadLinkedRecipe={loadLinkedRecipe}
			renderOpenLink={renderOpenLink}
			loadLinkedRecipes={loadLinkedRecipes}
			searchLinkableUsers={(query) =>
				searchLinkableUsersServerFn({ data: { query } })
			}
			loadUserRecipes={(handle) =>
				listUserPublicRecipesServerFn({ data: { handle } })
			}
			loadLinkTargets={async () => {
				const recipes = await listRecipesServerFn();

				// 編集中のレシピ自身には、リンクできない。
				return recipes
					.filter((candidate) => candidate.publicId !== recipe.publicId)
					.map(({ publicId, name, createdAt }) => ({
						publicId,
						name,
						createdAt,
					}));
			}}
			onSave={(document) =>
				updateRecipeServerFn({
					data: { publicId: recipe.publicId, document },
				})
			}
			onSaved={() =>
				void navigate({
					to: "/recipes/$publicId",
					params: { publicId: recipe.publicId },
				})
			}
		/>
	);
}
