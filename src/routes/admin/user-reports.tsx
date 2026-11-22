import { createFileRoute, useRouter } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { AdminRouteError } from "#/features/admin/components/admin-route-error";
import * as adminApi from "#/features/admin/infrastructure/admin-api";
import { AdminUserReportsPage } from "#/features/reports/components/admin-user-reports-page";

export const Route = createFileRoute("/admin/user-reports")({
	head: () => ({ meta: [{ title: pageTitle("ユーザー名の通報（管理者）") }] }),
	loader: async () => {
		const [open, resolved] = await Promise.all([
			adminApi.listOpenUserReports(),
			adminApi.listResolvedUserReports(),
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
				const result = await adminApi.resolveUserReport({ reportId, action });

				void router.invalidate();

				return result;
			}}
		/>
	);
}
