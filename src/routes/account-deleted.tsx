import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { pageTitle } from "#/config/app";
import { AccountDeletedPage } from "#/features/profile/components/account-deleted-page";
import { clearLocalData } from "#/local-db/clear-local-data";

export const Route = createFileRoute("/account-deleted")({
	head: () => ({ meta: [{ title: pageTitle("退会しました") }] }),
	component: AccountDeletedRoute,
});

// アカウントを削除したあとに開く画面。この端末に残っているデータも、消す。
function AccountDeletedRoute() {
	useEffect(() => {
		void clearLocalData();
	}, []);

	return <AccountDeletedPage />;
}
