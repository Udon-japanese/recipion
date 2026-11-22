import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { RecipeCookList } from "#/features/recipes/components/recipe-cook-list";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { RecipeMadeFrame } from "#/features/recipes/components/recipes-frame";
import * as recipesApi from "#/features/recipes/infrastructure/recipes-api";

// つくった記録（日付ごとの履歴）。
export const Route = createFileRoute("/recipes/made")({
	// ブラウザだけで描く（データは API から読む。サーバーの中では API を呼べないため。Web の最終形は SPA）。
	ssr: false,
	head: () => ({ meta: [{ title: pageTitle("つくった記録") }] }),
	loader: () => recipesApi.listRecipeCooks({}),
	errorComponent: RecipeRouteError,
	component: MadeRecipesPage,
});

function MadeRecipesPage() {
	const cookPage = Route.useLoaderData();

	return (
		<RecipeMadeFrame>
			<RecipeCookList
				initialPage={cookPage}
				loadMore={(cursor) => recipesApi.listRecipeCooks({ cursor })}
			/>
		</RecipeMadeFrame>
	);
}
