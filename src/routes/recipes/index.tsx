import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as v from "valibot";
import { pageTitle } from "#/config/app";
import { PublicRecipeList } from "#/features/recipes/components/public-recipe-list";
import { RecipeList } from "#/features/recipes/components/recipe-list";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { maxSearchQueryLength } from "#/features/recipes/domain/public-recipe-search";
import { listRecipesServerFn } from "#/features/recipes/server/list-recipes";
import { searchPublicRecipesServerFn } from "#/features/recipes/server/search-public-recipes";

export const Route = createFileRoute("/recipes/")({
	head: () => ({ meta: [{ title: pageTitle("レシピ") }] }),
	// tab：自分のレシピ（mine）／みんなのレシピ（public）。q：みんなのレシピの検索語。
	validateSearch: v.object({
		tab: v.optional(v.picklist(["mine", "public"]), "mine"),
		q: v.optional(v.pipe(v.string(), v.maxLength(maxSearchQueryLength)), ""),
	}),
	loaderDeps: ({ search }) => ({ tab: search.tab, query: search.q }),
	loader: async ({ deps }) => {
		const [recipes, publicPage] = await Promise.all([
			deps.tab === "mine" ? listRecipesServerFn() : Promise.resolve([]),
			deps.tab === "public"
				? searchPublicRecipesServerFn({ data: { query: deps.query } })
				: Promise.resolve(null),
		]);

		return { recipes, publicPage, query: deps.query };
	},
	errorComponent: RecipeRouteError,
	component: RecipesPage,
});

function RecipesPage() {
	const { recipes, publicPage, query } = Route.useLoaderData();
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: "/recipes/" });

	return (
		<RecipeList
			recipes={recipes}
			tab={tab}
			onTabChange={(nextTab) =>
				void navigate({ search: { tab: nextTab, q: "" } })
			}
			publicPanel={
				publicPage ? (
					<PublicRecipeList
						key={query}
						query={query}
						initialPage={publicPage}
						onSearch={(nextQuery) =>
							void navigate({ search: { tab: "public", q: nextQuery } })
						}
						loadMore={(cursor) =>
							searchPublicRecipesServerFn({ data: { query, cursor } })
						}
					/>
				) : null
			}
		/>
	);
}
