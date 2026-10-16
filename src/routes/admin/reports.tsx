import { createFileRoute, useRouter } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { AdminRouteError } from "#/features/admin/components/admin-route-error";
import { AdminReportsPage } from "#/features/reports/components/admin-reports-page";
import {
	getReportedRecipeServerFn,
	listOpenReportsServerFn,
	listResolvedReportsServerFn,
	resolveReportServerFn,
} from "#/features/reports/server/admin-reports";

export const Route = createFileRoute("/admin/reports")({
	head: () => ({ meta: [{ title: pageTitle("通報（管理者）") }] }),
	loader: async () => {
		const [open, resolved] = await Promise.all([
			listOpenReportsServerFn(),
			listResolvedReportsServerFn(),
		]);

		return { open, resolved };
	},
	errorComponent: AdminRouteError,
	component: AdminReportsRoute,
});

function AdminReportsRoute() {
	const { open: reports, resolved } = Route.useLoaderData();
	const router = useRouter();

	return (
		<AdminReportsPage
			reports={reports}
			resolved={resolved}
			loadRecipe={(reportId) =>
				getReportedRecipeServerFn({ data: { reportId } })
			}
			onResolve={async (reportId, action) => {
				const result = await resolveReportServerFn({
					data: { reportId, action },
				});

				void router.invalidate();

				return result;
			}}
		/>
	);
}
