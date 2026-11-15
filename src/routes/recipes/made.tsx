import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { RecipeCookList } from "#/features/recipes/components/recipe-cook-list";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { RecipeMadeFrame } from "#/features/recipes/components/recipes-frame";
import { listRecipeCooksServerFn } from "#/features/recipes/server/recipe-cook-log";

// つくった記録（日付ごとの履歴）。
export const Route = createFileRoute("/recipes/made")({
	head: () => ({ meta: [{ title: pageTitle("つくった記録") }] }),
	loader: () => listRecipeCooksServerFn({ data: {} }),
	errorComponent: RecipeRouteError,
	component: MadeRecipesPage,
});

function MadeRecipesPage() {
	const cookPage = Route.useLoaderData();

	return (
		<RecipeMadeFrame>
			<RecipeCookList
				initialPage={cookPage}
				loadMore={(cursor) => listRecipeCooksServerFn({ data: { cursor } })}
			/>
		</RecipeMadeFrame>
	);
}
