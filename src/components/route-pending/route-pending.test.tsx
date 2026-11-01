import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
} from "@tanstack/react-router";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RoutePending, routePendingOptions } from "./route-pending";

afterEach(cleanup);

const PENDING_TEXT = "よみこみ中...";

// 読み込みの終わりを、テストから決められる画面を1つ持つルーター（本物と同じ遅延の設定）。
async function renderRouter() {
	let finishLoad = () => {};
	const rootRoute = createRootRoute({ component: () => <Outlet /> });
	const homeRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/",
		component: () => <p>ホーム</p>,
	});
	const loadRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/load",
		loader: () =>
			new Promise<void>((resolve) => {
				finishLoad = resolve;
			}),
		component: () => <p>読み込んだ画面</p>,
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([homeRoute, loadRoute]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
		defaultPendingComponent: RoutePending,
		...routePendingOptions,
	});

	render(<RouterProvider router={router} />);
	await screen.findByText("ホーム");

	// 一度でも出たかを、見落とさずに記録する。
	let pendingShown = false;
	const observer = new MutationObserver(() => {
		pendingShown ||= document.body.textContent?.includes(PENDING_TEXT) ?? false;
	});
	observer.observe(document.body, {
		childList: true,
		subtree: true,
		characterData: true,
	});

	// アプリのルート一覧（Register）にない道なので、型の付いた navigate ではなく、履歴から移る。
	router.history.push("/load");

	return {
		finishLoad: () => finishLoad(),
		wasPendingShown: () => {
			observer.disconnect();
			return pendingShown;
		},
	};
}

describe("RoutePending", () => {
	it("速い読み込みでは、読み込み中の表示を出さない", async () => {
		const { finishLoad, wasPendingShown } = await renderRouter();

		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 50));
			finishLoad();
		});

		expect(await screen.findByText("読み込んだ画面")).toBeTruthy();
		expect(wasPendingShown()).toBe(false);
	});

	it("遅い読み込みでは、遅延のあとに出し、読み込みが終わると消す", async () => {
		const { finishLoad } = await renderRouter();

		expect(screen.queryByText(PENDING_TEXT)).toBeNull();
		const pending = await screen.findByRole("status");
		expect(pending.textContent).toBe(PENDING_TEXT);

		await act(async () => {
			finishLoad();
		});

		await waitFor(() => expect(screen.queryByText(PENDING_TEXT)).toBeNull(), {
			timeout: routePendingOptions.defaultPendingMinMs + 1000,
		});
		expect(screen.getByText("読み込んだ画面")).toBeTruthy();
	});
});
