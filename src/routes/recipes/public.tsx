import {
	createFileRoute,
	type HistoryState,
	stripSearchParams,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import * as v from "valibot";
import { pageTitle } from "#/config/app";
import { PublicRecipeList } from "#/features/recipes/components/public-recipe-list";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { RecipesFrame } from "#/features/recipes/components/recipes-frame";
import {
	maxSearchQueryLength,
	parseSearchTags,
} from "#/features/recipes/domain/public-recipe-search";
import { useRecipeSearchHistory } from "#/features/recipes/hooks/use-recipe-search-history";
import * as recipesApi from "#/features/recipes/infrastructure/recipes-api";

const defaultSearch = { q: "", tags: [] };

// みんなのレシピ。検索の条件（q：検索語、tags：公開用のタグ）は URL に持ち、そのまま共有できる。
// 空の条件は、URL に出さない（/recipes/public だけにする）。
export const Route = createFileRoute("/recipes/public")({
	head: () => ({ meta: [{ title: pageTitle("みんなのレシピ") }] }),
	validateSearch: v.object({
		q: v.optional(v.pipe(v.string(), v.maxLength(maxSearchQueryLength)), ""),
		// 語の一覧にないタグは、捨てる。
		tags: v.optional(
			v.pipe(
				v.array(v.string()),
				v.maxLength(20),
				v.transform((values) => parseSearchTags(values)),
			),
			[],
		),
	}),
	search: { middlewares: [stripSearchParams(defaultSearch)] },
	loaderDeps: ({ search }) => ({ query: search.q, tags: search.tags }),
	loader: async ({ deps }) => ({
		page: await recipesApi.searchPublicRecipes({
			query: deps.query,
			tags: deps.tags,
		}),
		query: deps.query,
		tags: deps.tags,
	}),
	errorComponent: RecipeRouteError,
	component: PublicRecipesPage,
});

function PublicRecipesPage() {
	const { page, query, tags } = Route.useLoaderData();
	const navigate = useNavigate({ from: "/recipes/public" });
	const router = useRouter();
	const history = useRecipeSearchHistory("/recipes/public");

	// ほかの画面へ移るとき、いまの条件を履歴に写す（切り替えで戻ってきたとき、URL へ戻すため）。
	// 条件は、移る時点の URL から読む（探した直後の読み込み中は、画面のデータがまだ前の条件のため）。
	function carryState(prev: HistoryState): HistoryState {
		const search = router.latestLocation.search;

		return history.withPublicSearch({
			query: search.q ?? "",
			tags: search.tags ?? [],
		})(prev);
	}

	return (
		<RecipesFrame
			tab="public"
			onTabChange={(tab) => {
				if (tab === "public") return;

				void navigate({ to: "/recipes", state: carryState });
			}}
			carryState={carryState}
		>
			<PublicRecipeList
				key={`${query}|${tags.join(",")}`}
				query={query}
				tags={tags}
				initialPage={page}
				onSearch={(nextQuery, nextTags) =>
					void navigate({
						search: { q: nextQuery, tags: nextTags },
						state: true,
					})
				}
				loadMore={(cursor) =>
					recipesApi.searchPublicRecipes({ query, tags, cursor })
				}
			/>
		</RecipesFrame>
	);
}
