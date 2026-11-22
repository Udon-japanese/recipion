import { Hono } from "hono";

import { errorResponse, toErrorResponse } from "#/api/error-response";
import { clientVersionMiddleware } from "#/api/middleware/client-version";
import { cookieSameOriginMiddleware } from "#/api/middleware/cookie-same-origin";
import type { ClientPlatform } from "#/config/client-versions";
import {
	createInventoryRoutes,
	type InventoryRouteDependencies,
} from "#/features/inventory/api/inventory-routes";
import {
	createModerationRoutes,
	type ModerationRouteDependencies,
} from "#/features/moderation/api/moderation-routes";
import {
	createMeRoutes,
	type MeRouteDependencies,
} from "#/features/profile/api/me-routes";
import {
	createRecipeRoutes,
	type RecipeRouteDependencies,
} from "#/features/recipes/api/recipe-routes";
import {
	createShoppingSyncRoutes,
	type ShoppingSyncRouteDependencies,
} from "#/features/shopping/api/shopping-sync-routes";

const NOT_FOUND_MESSAGE = "見つかりませんでした";

export type ApiDependencies = {
	// Better Auth の入口（/api/auth/*）。
	handleAuth: (request: Request) => Promise<Response>;
	minimumClientVersions: Record<ClientPlatform, string>;
	shoppingSync: ShoppingSyncRouteDependencies;
	inventory: InventoryRouteDependencies;
	recipes: RecipeRouteDependencies;
	me: MeRouteDependencies;
	moderation: ModerationRouteDependencies;
};

// API（Hono）の本体。外のもの（Better Auth・DB）は引数で受け取る（テストで差し替えるため。cloudflare:workers を読まない）。
export function createApiApp(dependencies: ApiDependencies) {
	const v1 = new Hono()
		// 最も古い版は、版の確認より先に登録する（古いアプリも、更新が要るかを確かめられるように）。
		.get("/meta", (c) =>
			c.json({ minimumClientVersions: dependencies.minimumClientVersions }),
		)
		.use(clientVersionMiddleware(dependencies.minimumClientVersions))
		.use(cookieSameOriginMiddleware)
		.route(
			"/shopping/sync",
			createShoppingSyncRoutes(dependencies.shoppingSync),
		)
		.route("/inventory", createInventoryRoutes(dependencies.inventory))
		.route("/recipes", createRecipeRoutes(dependencies.recipes))
		.route("/me", createMeRoutes(dependencies.me))
		.route("/moderation", createModerationRoutes(dependencies.moderation));

	const app = new Hono()
		// Better Auth は、自分で Origin を確かめる（trustedOrigins）。
		.all("/api/auth/*", (c) => dependencies.handleAuth(c.req.raw))
		.route("/api/v1", v1);

	app.onError((error, c) => toErrorResponse(error, c));
	app.notFound((c) => errorResponse(c, "NOT_FOUND", NOT_FOUND_MESSAGE));

	return app;
}

// API の型。画面の型つきクライアント（hc）が、`import type` だけで読む。
export type ApiApp = ReturnType<typeof createApiApp>;
