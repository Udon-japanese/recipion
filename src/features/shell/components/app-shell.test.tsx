import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

const mocks = vi.hoisted(() => ({
	pathname: "/shopping",
	session: {
		data: null as null | {
			user: { id: string; name: string; avatar: null };
		},
		isPending: false,
	},
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		to,
		children,
		...rest
	}: ComponentProps<"a"> & {
		to: string;
		children:
			| React.ReactNode
			| ((state: { isActive: boolean }) => React.ReactNode);
	}) => (
		<a href={to} {...rest}>
			{typeof children === "function"
				? children({ isActive: to === mocks.pathname })
				: children}
		</a>
	),
	createLink: () => (props: { to: string; children: React.ReactNode }) => (
		<a href={props.to}>{props.children}</a>
	),
	useRouterState: ({
		select,
	}: {
		select: (state: { location: { pathname: string } }) => string;
	}) => select({ location: { pathname: mocks.pathname } }),
}));

vi.mock("#/integrations/better-auth/use-app-session", () => ({
	useAppSession: () => mocks.session,
}));

afterEach(() => {
	cleanup();
	mocks.pathname = "/shopping";
	mocks.session = { data: null, isPending: false };
});

describe("AppShell", () => {
	it("ゲストは、ログインへのリンクが出る", () => {
		render(
			<AppShell>
				<p>本文</p>
			</AppShell>,
		);

		expect(screen.getByText("本文")).toBeTruthy();
		expect(
			screen.getAllByRole("link", { name: "ログイン" }).length,
		).toBeGreaterThan(0);
		expect(screen.queryByRole("link", { name: "プロフィール" })).toBeNull();
	});

	it("ログイン中は、アバターがプロフィールへのリンクになる", () => {
		mocks.session = {
			data: { user: { id: "u1", name: "れしぴょなー", avatar: null } },
			isPending: false,
		};

		render(
			<AppShell>
				<p>本文</p>
			</AppShell>,
		);

		expect(screen.getByRole("link", { name: "プロフィール" })).toBeTruthy();
		expect(screen.queryByRole("link", { name: "ログイン" })).toBeNull();
	});

	it("確認中は、アカウントの所を空けておく（誰の情報も出さない）", () => {
		mocks.session = { data: null, isPending: true };

		render(
			<AppShell>
				<p>本文</p>
			</AppShell>,
		);

		expect(screen.queryByRole("link", { name: "ログイン" })).toBeNull();
		expect(screen.queryByRole("link", { name: "プロフィール" })).toBeNull();
	});

	it("機能のナビは、買い物メモ・在庫・レシピ", () => {
		render(
			<AppShell>
				<p>本文</p>
			</AppShell>,
		);

		for (const name of ["買い物メモ", "在庫", "レシピ"]) {
			expect(screen.getAllByRole("link", { name }).length).toBeGreaterThan(0);
		}
	});

	it("ログイン画面では、枠を出さず、本文だけ", () => {
		mocks.pathname = "/login";

		render(
			<AppShell>
				<p>本文</p>
			</AppShell>,
		);

		expect(screen.getByText("本文")).toBeTruthy();
		expect(screen.queryByRole("navigation")).toBeNull();
	});
});
