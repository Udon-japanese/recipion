import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import {
	RoutePending,
	routePendingOptions,
} from "./components/route-pending/route-pending";
import { NotFoundPage } from "./errors/not-found-page";
import { RouteError } from "./errors/route-error";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		// 一度開いた画面に戻ったときも、読み直しを待ってから出す（既定の background は、古い値を先に見せる）。
		// 古い値を先に見せると、編集画面が保存前の本文で始まり、保存で上書きしてしまうため。
		defaultStaleReloadMode: "blocking",
		// 待つあいだ、中身の場所（ヘッダー・ナビは残す）に、読み込み中の表示を出す。
		defaultPendingComponent: RoutePending,
		...routePendingOptions,
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
