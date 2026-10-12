import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import * as v from "valibot";
import { AdminUsersPage } from "#/features/admin/components/admin-users-page";
import {
	liftSuspensionServerFn,
	searchAdminUsersServerFn,
	suspendUserServerFn,
} from "#/features/admin/server/admin-users";

export const Route = createFileRoute("/admin/users")({
	validateSearch: (search) =>
		v.parse(v.object({ q: v.optional(v.string(), "") }), search),
	loaderDeps: ({ search }) => ({ query: search.q }),
	loader: async ({ deps }) => ({
		query: deps.query,
		users: await searchAdminUsersServerFn({ data: { query: deps.query } }),
	}),
	errorComponent: AdminError,
	component: AdminUsersRoute,
});

// 管理者として確認できないとき（Access のログインがない、メールが一覧にない）や、読み込みの失敗。
function AdminError() {
	return <p>この画面は、管理者だけが使えます。</p>;
}

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
				const result = await suspendUserServerFn({ data: input });

				void router.invalidate();

				return result;
			}}
			onLift={async (userId) => {
				const result = await liftSuspensionServerFn({ data: { userId } });

				void router.invalidate();

				return result;
			}}
		/>
	);
}
