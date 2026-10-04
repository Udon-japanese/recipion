import { notFound } from "@tanstack/react-router";

import { getRecipeServerFn } from "#/features/recipes/server/get-recipe";

// 参照・編集の画面の loader で使う。
export async function loadRecipe(publicId: string) {
	const recipe = await getRecipeServerFn({ data: { publicId } });

	// 存在しない ID と、他のユーザーの ID は、どちらも同じ「見つかりません」にする。
	if (!recipe) throw notFound();

	return recipe;
}
