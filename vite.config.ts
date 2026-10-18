import { cloudflare } from "@cloudflare/vite-plugin";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig(({ isPreview }) => ({
	resolve: { tsconfigPaths: true },
	environments: {
		// 【開発サーバーだけの問題】サーバー側（ssr）の依存は、実行中に初めて見つかると、再最適化される。
		// そのとき、読み込み済みのモジュールが入れ替わらず、React が新旧で2つになり、描画が失敗する（Invalid hook call）。
		// Vite は、サーバー側の依存を、起動時には走査しない（optimizeDeps.entries も、サーバー側には効かない）。
		// ログに「optimized dependencies changed. reloading」が出て、そのあと Invalid hook call になったら、
		// その依存の名前（ログに出る）を、下の include に足して、キャッシュを消さずに、開発サーバーを起動し直す。
		ssr: {
			optimizeDeps: {
				include: [
					"react-dom/server",
					"@vanilla-extract/css",
					"@vanilla-extract/recipes",
					"@vanilla-extract/recipes/createRuntimeFn",
				],
			},
		},
		// scripts/postbuild-app-shell.ts が、今回のビルドが出したファイルの一覧として読む。
		client: { build: { manifest: true } },
	},
	plugins: [
		cloudflare({
			viteEnvironment: { name: "ssr" },
			// プレビューでは、リモートのバインディング（Workers AI は、常にリモート）を使わない（公式のオプション）。
			// 使うと、Cloudflare との接続が残って、Node のプロセスが終了せず、ビルドの後処理（scripts/postbuild-app-shell.ts）が終わらなくなる。
			// 開発サーバー（vite dev）は、既定のまま（リモートの Workers AI を使う）。デプロイされる設定には、影響しない。
			remoteBindings: !isPreview,
		}),
		tanstackStart(),
		viteReact(),
		vanillaExtractPlugin(),
	],
}));

export default config;
