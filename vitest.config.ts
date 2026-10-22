import { readFileSync } from "node:fs";
import { playwright } from "@vitest/browser-playwright";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		viteReact(),
		vanillaExtractPlugin(),
		// メンテ中の Worker（wrangler は .html を文字列として読み込む）と同じに、.html を文字列として読み込む。
		{
			name: "html-as-text",
			enforce: "pre",
			load(id) {
				if (id.endsWith(".html") && !id.includes("?")) {
					return `export default ${JSON.stringify(readFileSync(id, "utf8"))}`;
				}
			},
		},
	],
	test: {
		projects: [
			{
				test: {
					name: "unit",
					environment: "jsdom",
					// CI（遅い実行環境）でだけ、画面のテストが、まれに落ちる。原因が分かるまで、CI では 2 回まで再試行する
					// （再試行で通ったテストは、結果に「retry」と出る。手元では再試行しない）。
					retry: process.env.CI ? 2 : 0,
					// 画面の部品を描画するテストは、CI の遅い実行環境で 5 秒（既定）を超えることがある。
					testTimeout: 20_000,
					setupFiles: ["./src/test/setup.ts"],
					include: ["src/**/*.test.{ts,tsx}"],
					exclude: [
						"src/**/*.browser.test.{ts,tsx}",
					],
					clearMocks: true,
					restoreMocks: true,
				},
			},
			{
				// 初回（キャッシュなし）に、テストの途中で依存関係が最適化されてページが再読み込みされると、
				// React が二重に読み込まれて失敗する（CI で起きた）。テストの途中で見つかる依存は、ここに足す。
				optimizeDeps: {
					include: ["@vanilla-extract/recipes/createRuntimeFn"],
				},
				test: {
					name: "browser",
					include: [
						"src/**/*.browser.test.{ts,tsx}",
					],
					browser: {
						enabled: true,
						headless: true,
						provider: playwright(),
						instances: [
							{
								browser: "chromium",
							},
						],
					},
				},
			},
		],
	},
});