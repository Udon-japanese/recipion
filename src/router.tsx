import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { NotFoundPage } from "./errors/not-found-page";
import { RouteError } from "./errors/route-error";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		// errorComponent のない画面でも、内部のエラー文を出さない。
		defaultErrorComponent: RouteError,
		defaultNotFoundComponent: NotFoundPage,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
