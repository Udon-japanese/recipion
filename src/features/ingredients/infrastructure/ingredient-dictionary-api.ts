import { apiClient, readApiResponse } from "#/api/client";
import type { IngredientDictionaryCommand } from "../application/manage-ingredient-dictionary";

// 自分の食材辞書の API（/api/v1/ingredients/dictionary）を、画面から呼ぶ関数。失敗は ApiError を投げる。
const dictionary = apiClient.api.v1.ingredients.dictionary;

export async function listIngredientDictionary(input: {
	expectedUserId: string;
}) {
	return readApiResponse(await dictionary.$get({ query: input }));
}

export async function manageIngredientDictionary(input: {
	expectedUserId: string;
	command: IngredientDictionaryCommand;
}) {
	await readApiResponse(await dictionary.$post({ json: input }));
}
