import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
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
import { ShoppingSyncRunner } from "#/features/shopping/components/shopping-sync-runner";
import { useShoppingOwnerScope } from "#/features/shopping/hooks/use-shopping-owner-scope";
import { syncDexieShoppingMemo } from "#/features/shopping/infrastructure/sync-dexie-shopping-memo";
import { getInitialSessionServerFn } from "#/integrations/better-auth/get-initial-session";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	// 初回の描画でログイン状態がちらつかないよう、サーバーで確認した値を渡す。
	// 初期描画のためだけの値で、その後はクライアントのセッションが正になるため、画面遷移では再取得しない。
	// 取得に失敗しても（オフライン、DB の障害など）アプリ全体は開けるよう、サーバーの結果なし（undefined）に戻す。
	loader: async () => {
		// ブラウザで実行されるのは、静的なページ（Worker を通らず、サーバーの結果がない）のとき。
		// ログイン状態は、クライアントのセッション（authClient.useSession）が取るので、ここでは、サーバーに聞かない。
		if (typeof window !== "undefined") {
			return { initialSession: undefined };
		}

		try {
			return { initialSession: await getInitialSessionServerFn() };
		} catch {
			return { initialSession: undefined };
		}
	},
	staleTime: Number.POSITIVE_INFINITY,
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				// cover：画面の端（Android のジェスチャーナビゲーション・iPhone のホームバーの領域）まで、ページで描く。
				// 端の余白は、各部品が env(safe-area-inset-*) で取る（下のナビ・上のヘッダー・シートなど）。
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			// 他人のレシピは、ログインした人だけが見られるため、検索エンジンに載せない。
			{
				name: "robots",
				content: "noindex, nofollow",
			},
			{
				title: APP_DISPLAY_NAME,
			},
			{
				// 上のヘッダーと同じ色にして、OS のバーとひと続きに見せる（styles.css の --color-background）。
				name: "theme-color",
				content: "#fffdf7",
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes",
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "default",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest",
			},
			{
				rel: "icon",
				href: "/recipion-icon.svg",
				type: "image/svg+xml",
			},
		],
	}),
	component: RootLayout,
	shellComponent: RootDocument,
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
		<SuspensionGate>
			<AppShell onRefresh={onRefresh}>
				<Outlet />
				<ShoppingSyncRunner sync={syncDexieShoppingMemo} />
				<ToastViewport />
			</AppShell>
		</SuspensionGate>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ja">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<PwaRegister />
				<Scripts />
			</body>
		</html>
	);
}
