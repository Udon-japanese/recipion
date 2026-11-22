import { notFound } from "@tanstack/react-router";
import * as recipesApi from "#/features/recipes/infrastructure/recipes-api";

// 編集の画面の loader で使う（自分のレシピだけ）。
export async function loadRecipe(publicId: string) {
	const found = await recipesApi.getOwnRecipe({ publicId });

	// 存在しない ID と、他のユーザーの ID は、どちらも同じ「見つかりません」にする。
	if (!found) throw notFound();

	return found;
}
