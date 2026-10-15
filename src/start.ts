import { createMiddleware, createStart } from "@tanstack/react-start";
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

export const startInstance = createStart(() => ({
	functionMiddleware: [hideInternalErrorMiddleware],
}));
