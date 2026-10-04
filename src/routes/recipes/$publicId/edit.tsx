import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RecipeEditor } from "#/features/recipes/components/recipe-editor";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
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
