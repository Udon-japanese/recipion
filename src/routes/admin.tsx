import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";
import { AdminNav } from "#/features/admin/components/admin-nav";
import * as adminApi from "#/features/admin/infrastructure/admin-api";

// 管理者の画面の共通部分（ナビ）。
// 入口で、管理者かどうかを確かめ、管理者でなければ、ナビも含めて何も出さず、「見つかりません」にする。
// （各画面のデータの取得でも、API が、改めて確かめる。）
export const Route = createFileRoute("/admin")({
	// ブラウザだけで描く（データは API から読む。サーバーの中では API を呼べないため。Web の最終形は SPA）。
	ssr: false,
	beforeLoad: async () => {
		if (!(await adminApi.isAdmin())) {
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
