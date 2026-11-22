import type { InferRequestType } from "hono/client";

import { apiClient, readApiResponse } from "#/api/client";

// 通報の API（/api/v1/reports）を、画面から呼ぶ関数。失敗は ApiError を投げる。
const reports = apiClient.api.v1.reports;

export async function reportRecipe(
	input: InferRequestType<typeof reports.recipes.$post>["json"],
) {
	return (await readApiResponse(await reports.recipes.$post({ json: input })))
		.result;
}

export async function reportUserName(
	input: InferRequestType<typeof reports.users.$post>["json"],
) {
	return (await readApiResponse(await reports.users.$post({ json: input })))
		.result;
}
