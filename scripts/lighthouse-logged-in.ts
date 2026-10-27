// ログインが必要な画面（在庫・レシピ・プロフィールなど）を、Lighthouse で計測する。
// 使い方: `nr lighthouse:logged-in`（e2e 用の環境変数 .env.e2e.local が要る。e2e/env.example を参照）
//   LIGHTHOUSE_RUNS=3 nr lighthouse:logged-in      回数を変える（既定 1。中央値）
//   nr lighthouse:logged-in --skip-build           すでにあるビルド（dist）を使う
//
// 本番には、ログイン状態を持ち込まない。代わりに、本番と同じビルドを、ローカル（ポート 4173）で、
// e2e 専用の DB に向けて動かし、e2e のログイン（e2e/login.setup.ts）で作った状態で計測する。
// 数値は、ネットワークの条件が本番と違うので、絶対値ではなく、画面ごとの比較・変更の前後の比較に使う。
import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { assertE2eEnvironment } from "../e2e/safety.ts";
import { launchChrome, measurePages, printRows } from "./lighthouse-core.ts";

try {
	process.loadEnvFile(".env.e2e.local");
} catch {
	// ファイルがなければ、assertE2eEnvironment が、足りない値を知らせて止める。
}

assertE2eEnvironment();

const port = 4173;
const baseUrl = `http://localhost:${port}`;
const runs = Math.max(1, Number(process.env.LIGHTHOUSE_RUNS ?? 1));
const reportDir = "lighthouse-reports.local/logged-in";
const serverEnv = {
	...process.env,
	CLOUDFLARE_ENV: "e2e",
	CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE:
		process.env.DATABASE_URL ?? "",
};

// 1) e2e のログインで、ログイン状態（e2e/.auth/user.json）を作る（確認用ユーザーのシードも、ここで走る）。
execFileSync("pnpm", ["exec", "playwright", "test", "--project=setup"], {
	stdio: "inherit",
	env: process.env,
});

// 2) 本番と同じビルドを作る。
if (!process.argv.includes("--skip-build")) {
	execFileSync("pnpm", ["run", "build"], { stdio: "inherit", env: serverEnv });
}

// 3) ビルド済みのアプリを、e2e 用の環境で起動する。
const server: ChildProcess = spawn(
	"pnpm",
	["exec", "vite", "preview", "--port", String(port), "--strictPort"],
	{ stdio: "ignore", env: serverEnv },
);

async function waitForServer() {
	for (let i = 0; i < 60; i += 1) {
		try {
			const response = await fetch(`${baseUrl}/terms`);

			if (response.ok) {
				return;
			}
		} catch {
			// まだ起動していない。
		}

		await new Promise((resolve) => setTimeout(resolve, 1000));
	}

	throw new Error("プレビューのサーバーが起動しませんでした。");
}

const chrome = await launchChrome();

try {
	await waitForServer();

	// 4) 起動した Chrome に、保存したログイン状態（cookie）を入れる。
	const { cookies } = JSON.parse(
		readFileSync("e2e/.auth/user.json", "utf8"),
	) as { cookies: Parameters<import("playwright").BrowserContext["addCookies"]>[0] };
	const browser = await chromium.connectOverCDP(
		`http://127.0.0.1:${chrome.port}`,
	);
	const context = browser.contexts()[0];

	await context.addCookies(cookies);

	// 計測するレシピの詳細（シードの「肉じゃが」）の URL を、一覧から調べる。
	const page = await context.newPage();

	// ログインできていることを確かめる（できていなければ、ログイン画面を計測してしまう）。
	await page.goto(`${baseUrl}/inventory`);
	await page
		.getByRole("button", { name: /^玉ねぎ、/ })
		.waitFor({ timeout: 30_000 })
		.catch(() => {
			throw new Error(
				"ログイン状態で、在庫の画面が開けませんでした（cookie が効いていません）。",
			);
		});

	await page.goto(`${baseUrl}/recipes`);

	const recipePath = new URL(
		(await page.getByRole("link", { name: "肉じゃが" }).getAttribute("href")) ??
			"",
		baseUrl,
	).pathname;

	await page.close();

	const rows = await measurePages({
		port: chrome.port,
		baseUrl,
		paths: ["/inventory", "/recipes", recipePath, "/profile"],
		runs,
		reportDir,
		keepStorage: true,
	});

	printRows(
		`ログイン後の画面（ローカルのビルド済みアプリ。各 ${runs} 回の中央値）`,
		rows,
	);
	console.log(`\nレポート：${reportDir}/`);
	await browser.close();
} finally {
	chrome.kill();
	server.kill();
}
