import { Hono } from "hono";

import { errorResponse, toErrorResponse } from "#/api/error-response";
import { clientVersionMiddleware } from "#/api/middleware/client-version";
import { cookieSameOriginMiddleware } from "#/api/middleware/cookie-same-origin";
import type { ClientPlatform } from "#/config/client-versions";

const NOT_FOUND_MESSAGE = "見つかりませんでした";

export type ApiDependencies = {
	// Better Auth の入口（/api/auth/*）。
	handleAuth: (request: Request) => Promise<Response>;
	minimumClientVersions: Record<ClientPlatform, string>;
};

// API（Hono）の本体。外のもの（Better Auth・DB）は引数で受け取る（テストで差し替えるため。cloudflare:workers を読まない）。
export function createApiApp(dependencies: ApiDependencies) {
	const v1 = new Hono()
		// 最も古い版は、版の確認より先に登録する（古いアプリも、更新が要るかを確かめられるように）。
		.get("/meta", (c) =>
			c.json({ minimumClientVersions: dependencies.minimumClientVersions }),
		)
		.use(clientVersionMiddleware(dependencies.minimumClientVersions))
		.use(cookieSameOriginMiddleware);

	const app = new Hono()
		// Better Auth は、自分で Origin を確かめる（trustedOrigins）。
		.all("/api/auth/*", (c) => dependencies.handleAuth(c.req.raw))
		.route("/api/v1", v1);

	app.onError((error, c) => toErrorResponse(error, c));
	app.notFound((c) => errorResponse(c, "NOT_FOUND", NOT_FOUND_MESSAGE));

	return app;
}

export type ApiApp = ReturnType<typeof createApiApp>;
