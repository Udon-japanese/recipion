import {
	createRootRoute,
	HeadContent,
	Outlet,
	useRouter,
} from "@tanstack/react-router";
import { useCallback } from "react";
import { ToastViewport } from "#/components/toast/toast-viewport";
import { APP_DISPLAY_NAME } from "#/config/app";
import { SuspensionGate } from "#/features/moderation/components/suspension-gate";
import {
	isUserScope,
	refreshAppData,
} from "#/features/pull-refresh/application/refresh-app-data";
import { requestAppRefresh } from "#/features/pull-refresh/infrastructure/app-refresh-request";
import { PwaRegister } from "#/features/pwa/components/pwa-register";
import { AppShell } from "#/features/shell/components/app-shell";
import { ClientUpdateDialog } from "#/features/shell/components/client-update-dialog";
import { ShoppingSyncRunner } from "#/features/shopping/components/shopping-sync-runner";
import { useShoppingOwnerScope } from "#/features/shopping/hooks/use-shopping-owner-scope";
import { syncDexieShoppingMemo } from "#/features/shopping/infrastructure/sync-dexie-shopping-memo";

// 文字コード・viewport・manifest などの、どの画面でも同じ head は、index.html に書く。ここは題名だけ。
export const Route = createRootRoute({
	head: () => ({ meta: [{ title: APP_DISPLAY_NAME }] }),
	component: RootLayout,
});

function RootLayout() {
	const router = useRouter();
	const ownerScope = useShoppingOwnerScope();
	// 引っ張り更新：ルートの再読み込み、ログイン中は買い物メモの同期（他の端末の変更を受け取る）、在庫の再読み込みの通知。
	const onRefresh = useCallback(
		() =>
			refreshAppData({
				invalidateRoutes: () => router.invalidate(),
				syncShoppingMemo: isUserScope(ownerScope)
					? () => syncDexieShoppingMemo(ownerScope, "wake")
					: undefined,
				notify: requestAppRefresh,
			}),
		[router, ownerScope],
	);

	return (
		<>
			{/* SPA の head の置き場（TanStack Router の公式の手順：木のなるべく上）。 */}
			<HeadContent />
			<SuspensionGate>
				<AppShell onRefresh={onRefresh}>
					<Outlet />
					<ShoppingSyncRunner sync={syncDexieShoppingMemo} />
					<ToastViewport />
				</AppShell>
			</SuspensionGate>
			<ClientUpdateDialog />
			<PwaRegister />
		</>
	);
}
