import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RecipeDeleteButton } from "#/features/recipes/components/recipe-delete-button";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { RecipeView } from "#/features/recipes/components/recipe-view";
import { deleteRecipeServerFn } from "#/features/recipes/server/delete-recipe";
import { loadRecipe } from "#/features/recipes/server/load-recipe";

export const Route = createFileRoute("/recipes/$publicId/")({
	loader: ({ params }) => loadRecipe(params.publicId),
	errorComponent: RecipeRouteError,
	notFoundComponent: RecipeNotFound,
	component: RecipePage,
});

function RecipeNotFound() {
	return (
		<>
			<p>レシピが見つかりません。</p>
			<Link to="/recipes">レシピ一覧へ</Link>
		</>
	);
}

function RecipePage() {
	const recipe = Route.useLoaderData();
	const navigate = useNavigate();

	return (
		<>
			<RecipeView recipe={recipe} />
			<p>
				<Link
					to="/recipes/$publicId/edit"
					params={{ publicId: recipe.publicId }}
				>
					編集
				</Link>
			</p>
			<RecipeDeleteButton
				onDelete={async () => {
					await deleteRecipeServerFn({ data: { publicId: recipe.publicId } });
					await navigate({ to: "/recipes" });
				}}
			/>
			<p>
				<Link to="/recipes">レシピ一覧へ</Link>
			</p>
		</>
	);
}
