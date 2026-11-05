import { defineConfig, devices } from "@playwright/test";

// サービスワーカー（オフライン）の確認。サービスワーカーは本番ビルドでしか登録しないので（pwa-register.tsx）、
// 開発サーバーではなく、ビルドした dist を vite preview で配る。先に `pnpm run build` が要る（`nr e2e:pwa` が続けて行う）。
// ログインも DB も使わない（ログインなしで開ける画面と、オフラインのシェルだけを見る）。
const port = 4180;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
	testDir: "e2e/pwa",
	// 通常の e2e（*.spec.ts）と混ざらないよう、別の名前にする。
	testMatch: /\.pwa\.ts$/u,
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	timeout: 60_000,
	retries: 0,
	reporter: [["list"]],
	use: {
		baseURL,
		trace: "retain-on-failure",
	},
	// サービスワーカーは Chromium だけ（Playwright の資料）。
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: `pnpm exec vite preview --port ${port} --strictPort`,
		url: `${baseURL}/shopping`,
		reuseExistingServer: false,
		timeout: 120_000,
	},
});
