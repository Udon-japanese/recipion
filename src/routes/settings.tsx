import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { SettingsPage } from "#/features/settings/components/settings-page";

export const Route = createFileRoute("/settings")({
	head: () => ({ meta: [{ title: pageTitle("設定") }] }),
	// 設定は、この端末の保存（localStorage）から読む。
	ssr: false,
	component: SettingsPage,
});
