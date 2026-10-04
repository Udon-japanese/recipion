import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { RecipeRouteError } from "#/features/recipes/components/recipe-route-error";
import { RecipeView } from "#/features/recipes/components/recipe-view";
import { getRecipeServerFn } from "#/features/recipes/server/get-recipe";

export const Route = createFileRoute("/recipes/$publicId")({
	loader: async ({ params }) => {
		const recipe = await getRecipeServerFn({
			data: { publicId: params.publicId },
		});

		// 存在しない ID と、他のユーザーの ID は、どちらも同じ「見つかりません」にする。
		if (!recipe) throw notFound();

		return recipe;
	},
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

	return (
		<>
			<RecipeView recipe={recipe} />
			<p>
				<Link to="/recipes">レシピ一覧へ</Link>
			</p>
		</>
	);
}
