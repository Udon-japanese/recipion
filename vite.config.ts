import { cloudflare } from "@cloudflare/vite-plugin";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig(({ isPreview }) => ({
	// React は、1つだけにする（複数あると、Hooks が動かない）。
	resolve: { tsconfigPaths: true, dedupe: ["react", "react-dom"] },
	environments: {
		// 開発サーバーが、実行中に依存を見つけて再最適化すると、React が入れ替わって、最初の描画が失敗する。
		// 事前に、すべて最適化の対象にしておく。
		ssr: {
			optimizeDeps: {
				include: ["react-dom/server", "@vanilla-extract/css"],
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
