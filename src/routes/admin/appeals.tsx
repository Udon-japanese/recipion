import { createFileRoute, useRouter } from "@tanstack/react-router";
import { pageTitle } from "#/config/app";
import { AdminRouteError } from "#/features/admin/components/admin-route-error";
import { AdminAppealsPage } from "#/features/moderation/components/admin-appeals-page";
import {
	listOpenAppealsServerFn,
	listResolvedAppealsServerFn,
	resolveAppealServerFn,
} from "#/features/moderation/server/admin-appeals";

export const Route = createFileRoute("/admin/appeals")({
	head: () => ({ meta: [{ title: pageTitle("停止の申し立て（管理者）") }] }),
	loader: async () => {
		const [open, resolved] = await Promise.all([
			listOpenAppealsServerFn(),
			listResolvedAppealsServerFn(),
		]);

		return { open, resolved };
	},
	errorComponent: AdminRouteError,
	component: AdminAppealsRoute,
});

function AdminAppealsRoute() {
	const { open: appeals, resolved } = Route.useLoaderData();
	const router = useRouter();

	return (
		<AdminAppealsPage
			appeals={appeals}
			resolved={resolved}
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
