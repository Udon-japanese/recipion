import { hc } from "hono/client";

import type { ApiApp } from "#/api/create-api-app";
import { webClientVersion } from "#/config/client-versions";
import { readApiError } from "#/errors/api-error";
import { reportClientUpdateRequired } from "./client-update-required";
import { CLIENT_HEADER } from "./client-version";

// 画面から API を呼ぶ、型つきのクライアント。同じオリジンなので、Cookie は自動で付く。
// API の型は `import type` だけで読む（サーバーのコードは、画面の束に入らない）。
// 毎回、画面の種類と版を送る（古ければ、API は 426 を返す）。
export function createApiClient(fetch?: typeof globalThis.fetch) {
	return hc<ApiApp>("/", {
		headers: { [CLIENT_HEADER]: `web/${webClientVersion}` },
		...(fetch ? { fetch } : {}),
	});
}

export const apiClient = createApiClient();

// 応答を読む。失敗なら ApiError を投げる（通信そのものの失敗は、fetch の例外のまま）。
// 画面の版が古い（426）ときは、投げる前に、読み込み直しの案内を画面全体に出す。
export async function readApiResponse<T>(response: {
	ok: boolean;
	status: number;
	json(): Promise<T>;
}): Promise<T> {
	if (!response.ok) {
		const error = await readApiError(response);

		if (error.code === "CLIENT_UPDATE_REQUIRED") {
			reportClientUpdateRequired();
		}

		throw error;
	}

	return response.json();
}
