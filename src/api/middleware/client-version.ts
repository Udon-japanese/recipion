import { createMiddleware } from "hono/factory";

import { CLIENT_HEADER, checkClientVersion } from "#/api/client-version";
import { errorResponse } from "#/api/error-response";
import type { ClientPlatform } from "#/config/client-versions";

export const CLIENT_UPDATE_REQUIRED_MESSAGE =
	"このアプリの版は古くなりました。最新の版に更新してください";

const INVALID_CLIENT_MESSAGE = "クライアントの種類と版を読み取れませんでした";

// クライアントの版を確かめる。受け付ける最も古い版より古ければ 426 を返す。
export function clientVersionMiddleware(
	minimums: Record<ClientPlatform, string>,
) {
	return createMiddleware(async (c, next) => {
		const check = checkClientVersion(c.req.header(CLIENT_HEADER), minimums);

		if (check === "too-old") {
			return errorResponse(
				c,
				"CLIENT_UPDATE_REQUIRED",
				CLIENT_UPDATE_REQUIRED_MESSAGE,
			);
		}

		if (check === "invalid") {
			return errorResponse(c, "INVALID_INPUT", INVALID_CLIENT_MESSAGE);
		}

		// 移行のコード：今の Web の画面は、このヘッダーを送らない。ヘッダーのない要求は、当面は通す。
		// Web の画面がヘッダーを送るようになり、送らない古い画面がなくなったら、"missing" も 400 にする。
		await next();
	});
}
