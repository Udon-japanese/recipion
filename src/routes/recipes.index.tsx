import { createFileRoute } from "@tanstack/react-router";
import { RecipeList } from "#/features/recipes/components/recipe-list";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { listRecipesServerFn } from "#/features/recipes/server/list-recipes";

export const Route = createFileRoute("/recipes/")({
	loader: () => listRecipesServerFn(),
	errorComponent: RecipeRouteError,
	component: RecipesPage,
});

function RecipesPage() {
	const recipes = Route.useLoaderData();

	return <RecipeList recipes={recipes} />;
}
