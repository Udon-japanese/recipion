import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AdminReportsPage } from "#/features/reports/components/admin-reports-page";
import {
	getReportedRecipeServerFn,
	listOpenReportsServerFn,
	resolveReportServerFn,
} from "#/features/reports/server/admin-reports";

export const Route = createFileRoute("/admin/reports")({
	loader: () => listOpenReportsServerFn(),
	errorComponent: AdminError,
	component: AdminReportsRoute,
});

// 管理者として確認できないとき（Access のログインがない、メールが一覧にない）や、読み込みの失敗。
function AdminError() {
	return <p>この画面は、管理者だけが使えます。</p>;
}

function AdminReportsRoute() {
	const reports = Route.useLoaderData();
	const router = useRouter();

	return (
		<AdminReportsPage
			reports={reports}
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
