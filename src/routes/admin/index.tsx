import { createFileRoute } from "@tanstack/react-router";
import { AdminHome } from "#/features/admin/components/admin-home";
import { AdminRouteError } from "#/features/admin/components/admin-route-error";
import { getAdminSummaryServerFn } from "#/features/admin/server/admin-summary";

export const Route = createFileRoute("/admin/")({
	loader: () => getAdminSummaryServerFn(),
	errorComponent: AdminRouteError,
	component: AdminIndexRoute,
});

function AdminIndexRoute() {
	const summary = Route.useLoaderData();

	return <AdminHome {...summary} />;
}
