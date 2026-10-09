import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RecipeEditor } from "#/features/recipes/components/recipe-editor";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { listRecipesServerFn } from "#/features/recipes/server/list-recipes";
import { loadRecipe } from "#/features/recipes/server/load-recipe";
import { updateRecipeServerFn } from "#/features/recipes/server/update-recipe";

export const Route = createFileRoute("/recipes/$publicId/edit")({
	loader: ({ params }) => loadRecipe(params.publicId),
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
