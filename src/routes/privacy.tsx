import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { PrivacyPage } from "#/features/legal/components/privacy-page";

export const Route = createFileRoute("/privacy")({
	head: () => ({ meta: [{ title: pageTitle("プライバシーポリシー") }] }),
	component: PrivacyPage,
});
