import { cloudflare } from "@cloudflare/vite-plugin";

import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig(({ isPreview }) => ({
	resolve: { tsconfigPaths: true },
	environments: {
		// scripts/postbuild-app-shell.ts が、今回のビルドが出したファイルの一覧として読む。
		client: { build: { manifest: true } },
	},
	plugins: [
		cloudflare({
			// プレビューでは、リモートのバインディング（Workers AI は、常にリモート）を使わない（公式のオプション）。
			// 使うと、Cloudflare との接続が残って、Node のプロセスが終了せず、ビルドの後処理（scripts/postbuild-app-shell.ts）が終わらなくなる。
			// 開発サーバー（vite dev）は、既定のまま（リモートの Workers AI を使う）。デプロイされる設定には、影響しない。
			remoteBindings: !isPreview,
		}),
		// TanStack Router の公式の手順：@vitejs/plugin-react より先に置く。
		tanstackRouter({ target: "react", autoCodeSplitting: true }),
		viteReact(),
		vanillaExtractPlugin(),
	],
}));

export default config;
