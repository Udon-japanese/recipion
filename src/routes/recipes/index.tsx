import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { RecipeList } from "#/features/recipes/components/recipe-list";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { RecipesFrame } from "#/features/recipes/components/recipes-frame";
import type { OwnRecipeSearch } from "#/features/recipes/domain/recipe-search-history";
import { useRecipeSearchHistory } from "#/features/recipes/hooks/use-recipe-search-history";
import * as recipesApi from "#/features/recipes/infrastructure/recipes-api";

// 自分のレシピ。検索の条件は、個人用のタグを含むため URL に出さず、履歴（history state）に持つ。
// みんなのレシピは /recipes/public、つくった記録は /recipes/made。
export const Route = createFileRoute("/recipes/")({
	// ブラウザだけで描く（データは API から読む。サーバーの中では API を呼べないため。Web の最終形は SPA）。
	ssr: false,
	head: () => ({ meta: [{ title: pageTitle("レシピ") }] }),
	loader: () => recipesApi.listRecipes(),
	errorComponent: RecipeRouteError,
	component: OwnRecipesPage,
});

function OwnRecipesPage() {
	const recipes = Route.useLoaderData();
	const navigate = useNavigate({ from: "/recipes/" });
	const history = useRecipeSearchHistory("/recipes");
	const { own } = history;

	// 条件が変わるたびに、履歴を増やさず、いまの履歴の項目に書く（URL は変えない）。
	function saveOwnSearch(next: OwnRecipeSearch) {
		void navigate({ state: history.withOwnSearch(next), replace: true });
	}

	return (
		<RecipesFrame
			tab="mine"
			// みんなのレシピへ：最後に探した条件を URL に戻し、自分のレシピの条件は、履歴に引き継ぐ。
			onTabChange={(tab) => {
				if (tab === "mine") return;

				void navigate({
					to: "/recipes/public",
					search: {
						q: history.lastPublic?.query ?? "",
						tags: history.lastPublic?.tags ?? [],
					},
					state: true,
				});
			}}
			carryState={(prev) => prev}
		>
			<RecipeList
				recipes={recipes}
				query={own.query}
				onQueryChange={(query) =>
					saveOwnSearch({ query, tagFilters: own.tagFilters })
				}
				tagFilters={own.tagFilters}
				onTagFiltersChange={(tagFilters) =>
					saveOwnSearch({ query: own.query, tagFilters })
				}
				restoreKey={history.restoreKey}
				isRestoring={history.isRestoring}
			/>
		</RecipesFrame>
	);
}
