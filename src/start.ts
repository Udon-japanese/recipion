import {
	createCsrfMiddleware,
	createMiddleware,
	createStart,
} from "@tanstack/react-start";
import { hideInternalError } from "./errors/hide-internal-error";

// すべてのサーバー関数の入口。内部のエラー（DB・外部サービスの失敗など）は、画面に出さず、サーバーのログに残す。
const hideInternalErrorMiddleware = createMiddleware({
	type: "function",
}).server(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		throw hideInternalError(error);
	}
});

// サーバー関数は、同じオリジンからの呼び出しだけ受け付ける（Sec-Fetch-Site・Origin・Referer を確かめる）。別のサイトからの送信（CSRF）は、403 で断る。
// /api/ で始まる要求（Better Auth と API）は、src/server.ts が Hono に渡すので、ここには来ない。対象はサーバー関数だけ。
const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware],
	functionMiddleware: [hideInternalErrorMiddleware],
}));
