import { hc } from "hono/client";

import type { ApiApp } from "#/api/create-api-app";
import { readApiError } from "#/errors/api-error";

// 画面から API を呼ぶ、型つきのクライアント。同じオリジンなので、Cookie は自動で付く。
// API の型は `import type` だけで読む（サーバーのコードは、画面の束に入らない）。
export function createApiClient(fetch?: typeof globalThis.fetch) {
	return hc<ApiApp>("/", fetch ? { fetch } : undefined);
}

export const apiClient = createApiClient();

// 応答を読む。失敗なら ApiError を投げる（通信そのものの失敗は、fetch の例外のまま）。
export async function readApiResponse<T>(response: {
	ok: boolean;
	status: number;
	json(): Promise<T>;
}): Promise<T> {
	if (!response.ok) {
		throw await readApiError(response);
	}

	return response.json();
}
