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

// レシピの画面に出す分（中身・作者・日付・もとにしたレシピ）。見てはいけない・存在しないは null。
export async function viewRecipe(input: { publicId: string }) {
	return readApiResponse(await recipes.view.$get({ query: input }));
}

// 限定公開のレシピを、パスフレーズで開ける。
export async function unlockRecipe(input: JsonOf<typeof recipes.unlock>) {
	return (await readApiResponse(await recipes.unlock.$post({ json: input })))
		.result;
}

// 自分の限定公開レシピの、パスフレーズ（限定公開でなければ null）。
export async function getRecipePassphrase(input: { publicId: string }) {
	return (
		await readApiResponse(await recipes.passphrase.$get({ query: input }))
	).passphrase;
}

export async function regenerateRecipePassphrase(
	input: JsonOf<typeof recipes.passphrase.regenerate>,
) {
	return (
		await readApiResponse(
			await recipes.passphrase.regenerate.$post({ json: input }),
		)
	).passphrase;
}

// 材料のリンク先のレシピを、リンク先の中のリンクもたどって、まとめて取る（公開 ID → レシピ）。
export async function getLinkedRecipes(input: JsonOf<typeof recipes.linked>) {
	return readApiResponse(await recipes.linked.$post({ json: input }));
}

export async function searchLinkableUsers(input: { query: string }) {
	return readApiResponse(
		await recipes["linkable-users"].$get({ query: input }),
	);
}

export async function listUserPublicRecipes(input: { handle: string }) {
	return readApiResponse(
		await recipes["linkable-users"].recipes.$get({ query: input }),
	);
}

// 自分の子のレシピの、親の変更を取り込むための材料。取り込めなければ null。
export async function getParentMergeSource(input: { publicId: string }) {
	return readApiResponse(await recipes["parent-merge"].$get({ query: input }));
}

export async function dismissParentChanges(
	input: JsonOf<(typeof recipes)["parent-merge"]["dismiss"]>,
) {
	return readApiResponse(
		await recipes["parent-merge"].dismiss.$post({ json: input }),
	);
}
