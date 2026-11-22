import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import * as v from "valibot";
import { pageTitle } from "#/config/app";
import { AdminRouteError } from "#/features/admin/components/admin-route-error";
import { AdminUsersPage } from "#/features/admin/components/admin-users-page";
import * as adminApi from "#/features/admin/infrastructure/admin-api";

export const Route = createFileRoute("/admin/users")({
	head: () => ({ meta: [{ title: pageTitle("ユーザー（管理者）") }] }),
	validateSearch: (search) =>
		v.parse(v.object({ q: v.optional(v.string(), "") }), search),
	// ブラウザだけで描く（データは API から読む。サーバーの中では API を呼べないため。Web の最終形は SPA）。
	ssr: false,
	loaderDeps: ({ search }) => ({ query: search.q }),
	loader: async ({ deps }) => ({
		query: deps.query,
		users: await adminApi.searchUsers({ query: deps.query }),
	}),
	errorComponent: AdminRouteError,
	component: AdminUsersRoute,
});

function AdminUsersRoute() {
	const { users, query } = Route.useLoaderData();
	const router = useRouter();
	const navigate = useNavigate({ from: "/admin/users" });

	return (
		<AdminUsersPage
			users={users}
			query={query}
			onSearch={(nextQuery) => void navigate({ search: { q: nextQuery } })}
			onSuspend={async (input) => {
				const result = await adminApi.suspendUser(input);

				void router.invalidate();

				return result;
			}}
			onLift={async (userId) => {
				const result = await adminApi.liftSuspension({ userId });

				void router.invalidate();

				return result;
			}}
		/>
	);
}
