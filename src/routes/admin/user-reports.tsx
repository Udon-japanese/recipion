import { createFileRoute, useRouter } from "@tanstack/react-router";
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
	errorComponent: AdminError,
	component: AdminUserReportsRoute,
});

// 管理者として確認できないとき（Access のログインがない、メールが一覧にない）や、読み込みの失敗。
function AdminError() {
	return <p>この画面は、管理者だけが使えます。</p>;
}

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
