import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { APP_DISPLAY_NAME } from "#/config/app";
import { AuthPanel } from "#/features/auth/components/auth-panel";
import { SuspensionGate } from "#/features/moderation/components/suspension-gate";
import { PwaRegister } from "#/features/pwa/components/pwa-register";
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
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			// 個人用のアプリのため、検索エンジンに載せない。
			{
				name: "robots",
				content: "noindex, nofollow",
			},
			{
				title: APP_DISPLAY_NAME,
			},
			{
				name: "theme-color",
				content: "#2563eb",
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
	return (
		<>
			<Link to="/">{APP_DISPLAY_NAME}</Link>

			<AuthPanel />

			<SuspensionGate>
				<Outlet />
			</SuspensionGate>
		</>
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
