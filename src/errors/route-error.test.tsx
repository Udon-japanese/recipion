import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RouteError } from "./route-error";
import { AUTH_REQUIRED_MESSAGE, UserFacingError } from "./user-facing-error";

afterEach(cleanup);

async function renderError(error: Error) {
	const rootRoute = createRootRoute({
		component: () => (
			<RouteError
				error={error}
				reset={() => {}}
				info={undefined}
				subject="レシピ"
				loginMessage="ログインすると、レシピを作成・閲覧できます"
			/>
		),
	});
	const loginRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/login",
	});
	const router = createRouter({
		routeTree: rootRoute.addChildren([loginRoute]),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});

	render(<RouterProvider router={router} />);
	await screen.findByRole("status");
}

describe("RouteError", () => {
	it("ログインが必要なときは、ログインへの案内を出し、読み込み直しは出さない", async () => {
		await renderError(new UserFacingError(AUTH_REQUIRED_MESSAGE));

		expect(
			screen.getByText("ログインすると、レシピを作成・閲覧できます"),
		).toBeTruthy();
		expect(screen.getByRole("link", { name: "ログイン" })).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: "もう一度読み込む" }),
		).toBeNull();
	});

	it("そのほかのエラーは、内部の文を出さず、読み込み直せる", async () => {
		await renderError(new Error('Failed query: select "x" from "recipe"'));

		expect(screen.queryByText(/Failed query/u)).toBeNull();
		expect(screen.getByText(/レシピを表示できませんでした/u)).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "もう一度読み込む" }),
		).toBeTruthy();
	});
});
