import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AdminAppealsPage } from "#/features/moderation/components/admin-appeals-page";
import {
	listOpenAppealsServerFn,
	resolveAppealServerFn,
} from "#/features/moderation/server/admin-appeals";

export const Route = createFileRoute("/admin/appeals")({
	loader: () => listOpenAppealsServerFn(),
	errorComponent: AdminError,
	component: AdminAppealsRoute,
});

// 管理者として確認できないとき（Access のログインがない、メールが一覧にない）や、読み込みの失敗。
function AdminError() {
	return <p>この画面は、管理者だけが使えます。</p>;
}

function AdminAppealsRoute() {
	const appeals = Route.useLoaderData();
	const router = useRouter();

	return (
		<AdminAppealsPage
			appeals={appeals}
			onResolve={async (appealId, action) => {
				const result = await resolveAppealServerFn({
					data: { appealId, action },
				});

				void router.invalidate();

				return result;
			}}
		/>
	);
}
