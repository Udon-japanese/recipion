import type { InferRequestType } from "hono/client";

import { apiClient, readApiResponse } from "#/api/client";

// レシピの API（/api/v1/recipes）を、画面から呼ぶ関数。失敗は ApiError を投げる。
const recipes = apiClient.api.v1.recipes;

type JsonOf<Endpoint extends { $post: unknown }> =
	InferRequestType<Endpoint["$post"]> extends { json: infer Json }
		? Json
		: never;

export async function listRecipes() {
	return readApiResponse(await recipes.$get());
}

export async function createRecipe(input: JsonOf<typeof recipes>) {
	return readApiResponse(await recipes.$post({ json: input }));
}

// 見てよいレシピ（存在しない・見てはいけないは null）。
export async function getRecipe(input: { publicId: string }) {
	return readApiResponse(await recipes.viewable.$get({ query: input }));
}

// 自分のレシピだけ（編集の画面）。存在しない・他の人のレシピは null。
export async function getOwnRecipe(input: { publicId: string }) {
	return readApiResponse(await recipes.own.$get({ query: input }));
}

export async function updateRecipe(input: JsonOf<typeof recipes.update>) {
	return readApiResponse(await recipes.update.$post({ json: input }));
}

export async function deleteRecipe(input: JsonOf<typeof recipes.delete>) {
	return readApiResponse(await recipes.delete.$post({ json: input }));
}

export async function forkRecipe(input: JsonOf<typeof recipes.fork>) {
	return readApiResponse(await recipes.fork.$post({ json: input }));
}

export async function recordRecipeCook(input: JsonOf<typeof recipes.cooks>) {
	return readApiResponse(await recipes.cooks.$post({ json: input }));
}

export async function cancelRecipeCook(
	input: JsonOf<typeof recipes.cooks.cancel>,
) {
	return readApiResponse(await recipes.cooks.cancel.$post({ json: input }));
}

export async function getRecipeCookStats(input: { publicId: string }) {
	return readApiResponse(await recipes.cooks.stats.$get({ query: input }));
}

export async function listRecipeCooks(input: { cursor?: string }) {
	return readApiResponse(await recipes.cooks.$get({ query: input }));
}
