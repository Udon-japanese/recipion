import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AdminNav } from "#/features/admin/components/admin-nav";

// 管理者の画面の共通部分（ナビ）。管理者かどうかの確認は、各画面のデータの取得（サーバー関数）で行う。
export const Route = createFileRoute("/admin")({
	component: AdminLayout,
});

function AdminLayout() {
	return (
		<>
			<AdminNav />
			<Outlet />
		</>
	);
}
