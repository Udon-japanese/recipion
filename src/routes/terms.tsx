import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { TermsPage } from "#/features/legal/components/terms-page";

export const Route = createFileRoute("/terms")({
	head: () => ({ meta: [{ title: pageTitle("利用規約") }] }),
	component: TermsPage,
});
