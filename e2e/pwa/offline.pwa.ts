import { type BrowserContext, expect, type Page, test } from "@playwright/test";

// public/sw.js の NAVIGATION_TIMEOUT_MS と合わせる。
const navigationTimeoutMs = 3000;

// サービスワーカーが、この画面を制御するまで待つ（初回は、有効になったあとの claim で制御される）。
async function waitForServiceWorker(page: Page) {
	await page.goto("/shopping");
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	await page.reload();
	await expect
		.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
		.toBe(true);
}

// 画面を開くのにかかった時間（ms）と、応答の状態。
async function timeNavigation(page: Page, path: string) {
	const start = Date.now();
	const response = await page.goto(path);

	return { status: response?.status(), elapsed: Date.now() - start };
}

// サービスワーカーが、ネットワークへ取りに行ったナビゲーションの数。
function countServiceWorkerFetches(context: BrowserContext, path: string) {
	const counter = { count: 0 };

	context.on("request", (request) => {
		if (request.serviceWorker() && new URL(request.url()).pathname === path) {
			counter.count += 1;
		}
	});

	return counter;
}

test.describe("画面を開く（ナビゲーション）", () => {
	test.beforeEach(async ({ page }) => {
		await waitForServiceWorker(page);
	});

	test("オンラインでは、ネットワークへ取りに行く（いつも最新）", async ({
		context,
		page,
	}) => {
		const fetches = countServiceWorkerFetches(context, "/shopping");

		await page.goto("/shopping");

		expect(fetches.count).toBeGreaterThan(0);
	});

	test("オフラインでは、待たずに、キャッシュの画面を出す（静的な写しの画面・サーバーで描く画面）", async ({
		context,
		page,
	}) => {
		await context.setOffline(true);

		for (const path of ["/shopping", "/recipes"]) {
			const { status, elapsed } = await timeNavigation(page, path);

			expect(status).toBe(200);
			expect(elapsed).toBeLessThan(1000);
		}

		await expect(page.locator("body")).not.toBeEmpty();
	});

	test("応答が遅いとき（つながるが届かない）は、上限の時間でキャッシュに切り替える", async ({
		context,
		page,
	}) => {
		// サービスワーカーが出す要求も、context.route で止められる（Chromium。Playwright の資料）。
		await context.route("**/shopping", async (route) => {
			await new Promise((resolve) => setTimeout(resolve, 10_000));
			await route.continue();
		});

		const { status, elapsed } = await timeNavigation(page, "/shopping");

		expect(status).toBe(200);
		expect(elapsed).toBeGreaterThanOrEqual(navigationTimeoutMs - 200);
		expect(elapsed).toBeLessThan(navigationTimeoutMs + 2000);
	});
});

test.describe("前のビルドのキャッシュ", () => {
	// サービスワーカーを登録しない画面（テキストのファイル）で、前のビルドのキャッシュを2つ作ってから、アプリを開く。
	// （本物の更新は、サービスワーカーの本体の取り直しを Playwright で差し替えられないため、有効になるときの扱いだけを見る。）
	test("1つ前だけを残し、そのファイルは使える。画面の HTML には使わない", async ({
		context,
		page,
	}) => {
		await page.goto("/robots.txt");
		await page.evaluate(async () => {
			const older = await caches.open("recipion-build-older0000");

			await older.put("/assets/older-only.js", new Response("older"));

			const previous = await caches.open("recipion-build-previous00");

			await previous.put(
				"/assets/previous-only.js",
				new Response("previous", {
					headers: { "Content-Type": "text/javascript" },
				}),
			);
			await previous.put(
				"/shopping",
				new Response("<p>前のビルドの画面</p>", {
					headers: { "Content-Type": "text/html" },
				}),
			);
		});

		await waitForServiceWorker(page);

		const names = await page.evaluate(() => caches.keys());

		expect(names).not.toContain("recipion-build-older0000");
		expect(names).toContain("recipion-build-previous00");
		expect(names.filter((name) => name.startsWith("recipion-build-"))).toHaveLength(
			2,
		);

		// 更新の前から開いている画面が、あとで読み込む前のビルドのファイルは、キャッシュから出る。
		expect(
			await page.evaluate(async () =>
				(await fetch("/assets/previous-only.js")).text(),
			),
		).toBe("previous");

		// オフラインで開く画面は、今のビルドのもの（前のビルドの HTML を出さない）。
		await context.setOffline(true);
		await page.goto("/shopping");

		await expect(page.getByText("前のビルドの画面")).toHaveCount(0);
	});
});
