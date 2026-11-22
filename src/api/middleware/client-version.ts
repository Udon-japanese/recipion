import { createMiddleware } from "hono/factory";

import { CLIENT_HEADER, checkClientVersion } from "#/api/client-version";
import { errorResponse } from "#/api/error-response";
import type { ClientPlatform } from "#/config/client-versions";

export const CLIENT_UPDATE_REQUIRED_MESSAGE =
	"アプリが新しくなりました。更新してから、もう一度お試しください";

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

		// 移行のコード：ヘッダーを送る前の Web の画面（開いたままのタブ・古い Service Worker のキャッシュ）のため、
		// ヘッダーのない要求は、当面は通す。Web はヘッダーを送るようにした（2026-11-22）。
		// 消す条件：そのデプロイから2週間たったら（2026-12-07 以降）、"missing" も 400 にする（docs/todo.md）。
		await next();
	});
}
