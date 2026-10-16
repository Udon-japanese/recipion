import { createFileRoute } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { AdminHome } from "#/features/admin/components/admin-home";
import { AdminRouteError } from "#/features/admin/components/admin-route-error";
import { getAdminSummaryServerFn } from "#/features/admin/server/admin-summary";

export const Route = createFileRoute("/admin/")({
	head: () => ({ meta: [{ title: pageTitle("管理者") }] }),
	loader: () => getAdminSummaryServerFn(),
	errorComponent: AdminRouteError,
	component: AdminIndexRoute,
});

function AdminIndexRoute() {
	const summary = Route.useLoaderData();

	return <AdminHome {...summary} />;
}
