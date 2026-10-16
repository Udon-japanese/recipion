import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { LoginPage } from "#/features/auth/components/login-page";

export const Route = createFileRoute("/login")({
	head: () => ({ meta: [{ title: pageTitle("ログイン") }] }),
	component: LoginPage,
});
