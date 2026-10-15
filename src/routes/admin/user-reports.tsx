import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AdminRouteError } from "#/features/admin/components/admin-route-error";
import { AdminUserReportsPage } from "#/features/reports/components/admin-user-reports-page";
import {
	listOpenUserReportsServerFn,
	listResolvedUserReportsServerFn,
	resolveUserReportServerFn,
} from "#/features/reports/server/admin-user-reports";

export const Route = createFileRoute("/admin/user-reports")({
	loader: async () => {
		const [open, resolved] = await Promise.all([
			listOpenUserReportsServerFn(),
			listResolvedUserReportsServerFn(),
		]);

		return { open, resolved };
	},
	errorComponent: AdminRouteError,
	component: AdminUserReportsRoute,
});

function AdminUserReportsRoute() {
	const { open, resolved } = Route.useLoaderData();
	const router = useRouter();

	return (
		<AdminUserReportsPage
			reports={open}
			resolved={resolved}
			onResolve={async (reportId, action) => {
				const result = await resolveUserReportServerFn({
					data: { reportId, action },
				});

				void router.invalidate();

				return result;
			}}
		/>
	);
}
