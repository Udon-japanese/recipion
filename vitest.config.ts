import { playwright } from "@vitest/browser-playwright";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [viteReact(), vanillaExtractPlugin()],
	test: {
		projects: [
			{
				test: {
					name: "unit",
					environment: "jsdom",
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