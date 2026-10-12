import { createFileRoute } from "@tanstack/react-router";
import { AdminHome } from "#/features/admin/components/admin-home";
import { getAdminSummaryServerFn } from "#/features/admin/server/admin-summary";

export const Route = createFileRoute("/admin/")({
	loader: () => getAdminSummaryServerFn(),
	errorComponent: AdminError,
	component: AdminIndexRoute,
});

// 管理者として確認できないとき（Access のログインがない、メールが一覧にない）や、読み込みの失敗。
function AdminError() {
	return <p>この画面は、管理者だけが使えます。</p>;
}

function AdminIndexRoute() {
	const summary = Route.useLoaderData();

	return <AdminHome {...summary} />;
}
