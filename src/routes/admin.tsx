import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { AdminNav } from "#/features/admin/components/admin-nav";
import { assertAdminServerFn } from "#/features/admin/server/assert-admin";

// 管理者の画面の共通部分（ナビ）。
// 入口で、管理者かどうかを確かめ、管理者でなければ、ナビも含めて何も出さず、「見つかりません」にする。
// （各画面のデータの取得でも、サーバー関数が、改めて確かめる。）
export const Route = createFileRoute("/admin")({
	beforeLoad: async () => {
		if (!(await assertAdminServerFn())) {
			throw notFound();
		}
	},
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
