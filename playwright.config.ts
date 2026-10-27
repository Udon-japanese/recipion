import { defineConfig, devices } from "@playwright/test";

// e2e 専用の環境変数（e2e/env.example を .env.e2e.local にコピーして、値を入れる）。
// 開発用の .env.local とは別。すでに設定済みの環境変数（CI など）は、上書きしない。
try {
	process.loadEnvFile(".env.e2e.local");
} catch {
	// ファイルがなければ、global-setup が、足りない値を知らせて止める。
}

const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
	testDir: "e2e",
	// 同じ確認用アカウントのデータを触るので、1本ずつ順に動かす（再現性を優先する）。
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	// 開発サーバーは、初回のコンパイルが遅いので、長めにする。
	timeout: 60_000,
	retries: 0,
	reporter: [["list"], ["html", { open: "never" }]],
	globalSetup: "./e2e/global-setup.ts",
	expect: {
		toHaveScreenshot: {
			// フォントの描画などの、わずかな差は許す。
			maxDiffPixelRatio: 0.01,
			animations: "disabled",
		},
	},
	use: {
		baseURL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [
		{ name: "setup", testMatch: /login\.setup\.ts/ },
		{
			name: "desktop",
			use: {
				...devices["Desktop Chrome"],
				viewport: { width: 1280, height: 800 },
				storageState: "e2e/.auth/user.json",
			},
			dependencies: ["setup"],
			testIgnore: /login\.setup\.ts/,
		},
		{
			name: "mobile",
			use: {
				...devices["Pixel 7"],
				storageState: "e2e/.auth/user.json",
			},
			dependencies: ["setup"],
			// 「つくった」のシートは、モバイルでは下から出て、初期の高さだと「元に戻す」が画面の外にある。
			// 操作の確認はデスクトップだけで行う（モバイルの見た目は、スクリーンショットで見る）。
			testIgnore: [/login\.setup\.ts/, /recipe-made\.spec\.ts/],
		},
	],
	webServer: {
		// 開発用（3000）とは別のポートで、e2e 専用の環境として起動する。
		// CLOUDFLARE_ENV=e2e は、`.env.e2e.local` を最優先で読ませる（開発用の .env.local の値は、上書きされる）。
		command: `pnpm exec vite dev --port ${port} --strictPort`,
		url: baseURL,
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			CLOUDFLARE_ENV: "e2e",
			// ローカルの Hyperdrive の接続先も、e2e 用の DB に固定する（.env.local の値に負けないよう、プロセスの環境変数で渡す）。
			CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE:
				process.env.DATABASE_URL ?? "",
		},
	},
});
