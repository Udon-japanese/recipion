import { createMiddleware } from "hono/factory";

import type {
	ResolvedSession,
	SessionOptions,
} from "#/integrations/better-auth/resolve-session";

export type SessionVariables = { session: ResolvedSession };

export type ResolveSession = (
	headers: Headers,
	options?: SessionOptions,
) => Promise<ResolvedSession>;

// ログインが要るルートに付ける。セッション（db・userId）を c.var.session に入れる。
// 確認できなければ、resolveSession が投げた UserFacingError を onError が 401・403 にする。
export function sessionMiddleware(
	resolve: ResolveSession,
	options: SessionOptions = {},
) {
	return createMiddleware<{ Variables: SessionVariables }>(async (c, next) => {
		c.set("session", await resolve(c.req.raw.headers, options));
		await next();
	});
}
