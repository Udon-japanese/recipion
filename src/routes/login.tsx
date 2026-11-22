import { createFileRoute } from "@tanstack/react-router";
import * as v from "valibot";
import { pageTitle } from "#/config/app";
import { LoginPage } from "#/features/auth/components/login-page";
import { toSafeRedirectPath } from "#/features/auth/domain/login-redirect";

export const Route = createFileRoute("/login")({
	// redirect：ログインのあとに戻る、アプリの中のパス（限定公開のレシピのリンクから来たときなど）。
	validateSearch: v.object({
		redirect: v.optional(v.pipe(v.string(), v.maxLength(500))),
	}),
	head: () => ({ meta: [{ title: pageTitle("ログイン") }] }),
	component: LoginRoute,
});

function LoginRoute() {
	const { redirect } = Route.useSearch();

	return <LoginPage redirectTo={toSafeRedirectPath(redirect)} />;
}
