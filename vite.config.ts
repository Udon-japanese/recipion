import { cloudflare } from "@cloudflare/vite-plugin";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	environments: {
		// scripts/postbuild-app-shell.ts が、今回のビルドが出したファイルの一覧として読む。
		client: { build: { manifest: true } },
	},
	plugins: [
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tanstackStart(),
		viteReact(),
		vanillaExtractPlugin(),
	],
});

export default config;
