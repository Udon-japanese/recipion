import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { RecipeList } from "#/features/recipes/components/recipe-list";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { listRecipesServerFn } from "#/features/recipes/server/list-recipes";

export const Route = createFileRoute("/recipes/")({
	head: () => ({ meta: [{ title: pageTitle("レシピ") }] }),
	loader: () => listRecipesServerFn(),
	errorComponent: RecipeRouteError,
	component: RecipesPage,
});

function RecipesPage() {
	const recipes = Route.useLoaderData();

	return <RecipeList recipes={recipes} />;
}
