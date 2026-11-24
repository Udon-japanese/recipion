import type { InferRequestType } from "hono/client";

import { apiClient, readApiResponse } from "#/api/client";

// 在庫の API（/api/v1/inventory）を、画面から呼ぶ関数。失敗は ApiError を投げる。
const inventory = apiClient.api.v1.inventory;

type JsonOf<Endpoint extends { $post: unknown }> =
	InferRequestType<Endpoint["$post"]> extends { json: infer Json }
		? Json
		: never;

export async function listInventoryItems(input: { expectedUserId: string }) {
	return readApiResponse(await inventory.items.$get({ query: input }));
}

export async function registerInventoryItem(
	input: JsonOf<typeof inventory.items>,
) {
	return readApiResponse(await inventory.items.$post({ json: input }));
}

export async function recordInventoryPurchase(
	input: JsonOf<typeof inventory.purchases>,
) {
	return readApiResponse(await inventory.purchases.$post({ json: input }));
}

export async function adjustInventory(
	input: JsonOf<typeof inventory.adjustments>,
) {
	return readApiResponse(await inventory.adjustments.$post({ json: input }));
}

export async function changeInventoryTrackingMode(
	input: JsonOf<(typeof inventory.items)["tracking-mode"]>,
) {
	return readApiResponse(
		await inventory.items["tracking-mode"].$post({ json: input }),
	);
}

export async function deleteInventoryItem(
	input: JsonOf<typeof inventory.items.delete>,
) {
	return readApiResponse(await inventory.items.delete.$post({ json: input }));
}

export async function renameInventoryItem(
	input: JsonOf<typeof inventory.items.rename>,
) {
	return readApiResponse(await inventory.items.rename.$post({ json: input }));
}

export async function setInventoryItemArt(
	input: JsonOf<typeof inventory.items.art>,
) {
	return readApiResponse(await inventory.items.art.$post({ json: input }));
}

export async function setInventoryItemCategory(
	input: JsonOf<typeof inventory.items.category>,
) {
	return readApiResponse(await inventory.items.category.$post({ json: input }));
}

export async function changeStockUnit(
	input: JsonOf<(typeof inventory.items)["stock-unit"]>,
) {
	return readApiResponse(
		await inventory.items["stock-unit"].$post({ json: input }),
	);
}

export async function updateInventoryLot(
	input: JsonOf<typeof inventory.lots.update>,
) {
	return readApiResponse(await inventory.lots.update.$post({ json: input }));
}

export async function stockMadeRecipe(
	input: JsonOf<(typeof inventory)["made-recipes"]["stock"]>,
) {
	return readApiResponse(
		await inventory["made-recipes"].stock.$post({ json: input }),
	);
}

export async function correctRecipeConsumption(
	input: JsonOf<(typeof inventory)["recipe-consumptions"]["correct"]>,
) {
	return readApiResponse(
		await inventory["recipe-consumptions"].correct.$post({ json: input }),
	);
}

export async function undoRecipeConsumption(
	input: JsonOf<(typeof inventory)["recipe-consumptions"]["undo"]>,
) {
	return readApiResponse(
		await inventory["recipe-consumptions"].undo.$post({ json: input }),
	);
}
