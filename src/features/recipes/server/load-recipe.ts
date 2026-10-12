import { notFound } from "@tanstack/react-router";

import { getOwnRecipeServerFn } from "#/features/recipes/server/get-own-recipe";

// 編集の画面の loader で使う（自分のレシピだけ）。
export async function loadRecipe(publicId: string) {
	const recipe = await getOwnRecipeServerFn({ data: { publicId } });

	// 存在しない ID と、他のユーザーの ID は、どちらも同じ「見つかりません」にする。
	if (!recipe) throw notFound();

	return recipe;
}
