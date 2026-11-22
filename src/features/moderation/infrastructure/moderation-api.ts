import { apiClient, readApiResponse } from "#/api/client";

// 停止の状態と申し立ての API（/api/v1/moderation）を、画面から呼ぶ関数。失敗は ApiError を投げる。
const moderation = apiClient.api.v1.moderation;

// このアカウントの停止の状態（null は、停止されていない）。
export async function getAccountStatus() {
	return (await readApiResponse(await moderation["account-status"].$get()))
		.status;
}

export async function submitAppeal(input: { message: string }) {
	return readApiResponse(await moderation.appeals.$post({ json: input }));
}
