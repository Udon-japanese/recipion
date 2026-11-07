import { type Browser, expect, type Page, test } from "@playwright/test";
import {
	checkShoppingItem,
	loginWithDemoCode,
	removeShoppingItem,
	waitForOverlayHistory,
	waitForShoppingSent,
} from "./helpers";

// 同じアカウントでログインした2つのブラウザ（別々の IndexedDB）で、買い物メモが同期されること。
// 確認用アカウントのデータは、テストの間で残るので、名前に実行ごとの印を付ける。

// もう1つのブラウザ。@playwright/test の browser.newContext() は、いまのプロジェクトの use
//（画面の大きさ・端末・baseURL・storageState）を、既定で引き継ぐ。
async function openSecondBrowser(browser: Browser) {
	const context = await browser.newContext();

	return { context, page: await context.newPage() };
}

async function openShopping(page: Page) {
	await page.goto("/shopping");
	await expect(
		page.getByRole("button", { name: /^(追加|買うものを入れる)$/ }),
	).toBeVisible();
}

async function addItem(page: Page, name: string) {
	await page
		.getByRole("button", { name: /^(追加|買うものを入れる)$/ })
		.click();

	const input = page.getByRole("combobox", { name: "買うもの" });

	await input.fill(name);
	await input.press("Enter");
	await page.getByRole("button", { name: "完了" }).click();
	await expect(checkbox(page, name)).toBeVisible();
	await waitForOverlayHistory(page);
}

function checkbox(page: Page, name: string) {
	return page.getByRole("checkbox", { name: `${name}をチェック` });
}

// 受け取るのは、開き直したとき（定期的には受け取らない）。届くまで、開き直す。
async function reloadUntil(page: Page, check: () => Promise<void>) {
	await expect(async () => {
		await page.reload();
		await check();
	}).toPass({ timeout: 30_000 });
}

// その人の買い物メモの項目が、この端末（IndexedDB）にいくつあるか。
function countAccountItems(page: Page) {
	return page.evaluate(
		() =>
			new Promise<number>((resolve, reject) => {
				const open = indexedDB.open("recipion-local");

				open.onerror = () => reject(open.error);
				open.onsuccess = () => {
					const request = open.result
						.transaction("shoppingItems")
						.objectStore("shoppingItems")
						.getAll();

					request.onsuccess = () =>
						resolve(
							request.result.filter((item: { ownerScope?: string }) =>
								item.ownerScope?.startsWith("user:"),
							).length,
						);
				};
			}),
	);
}

test("片方のブラウザで足した・チェックした・消した項目が、もう片方に届く", async ({
	page,
	browser,
}) => {
	const name = `同期${Date.now()}`;
	const second = await openSecondBrowser(browser);

	try {
		await openShopping(page);
		await openShopping(second.page);

		await addItem(page, name);
		await reloadUntil(second.page, () =>
			expect(checkbox(second.page, name)).toBeVisible({ timeout: 2_000 }),
		);

		await checkShoppingItem(page, name);
		await reloadUntil(second.page, () =>
			expect(checkbox(second.page, name)).toBeChecked({ timeout: 2_000 }),
		);

		await waitForShoppingSent(page);
		await removeShoppingItem(second.page, name);
		await reloadUntil(page, () =>
			expect(checkbox(page, name)).toHaveCount(0, { timeout: 2_000 }),
		);
	} finally {
		await second.context.close();
	}
});

test("ログアウトすると、この端末からその人のメモが消え、ログインし直すとサーバーから戻る", async ({
	browser,
}) => {
	// ログアウトは、そのブラウザのセッションを終わらせる。ほかのテストが使い回すセッションを消さないよう、
	// このテストだけで、別にログインする（desktop だけで動かす）。
	test.skip(test.info().project.name !== "desktop", "desktop だけで動かす");
	// ログインを2回するので、長めにする。
	test.setTimeout(120_000);

	// ログインしていないブラウザ（引き継ぐ storageState を、空にする）。
	const context = await browser.newContext({
		storageState: { cookies: [], origins: [] },
	});
	const page = await context.newPage();
	const name = `ログアウト${Date.now()}`;

	try {
		await loginWithDemoCode(page);
		await openShopping(page);
		await addItem(page, name);
		await waitForShoppingSent(page);
		expect(await countAccountItems(page)).toBeGreaterThan(0);

		// ログアウトは、設定の「アカウント」のタブにある。
		await page.goto("/settings");
		await page.getByRole("tab", { name: "アカウント" }).click();
		await page.getByRole("button", { name: "ログアウト" }).click();
		await expect(page).toHaveURL(/\/$/);

		await expect.poll(() => countAccountItems(page)).toBe(0);

		await loginWithDemoCode(page);
		await openShopping(page);
		await reloadUntil(page, () =>
			expect(checkbox(page, name)).toBeVisible({ timeout: 2_000 }),
		);

		// 片付け（確認用アカウントのメモに、残さない）。
		await removeShoppingItem(page, name);
	} finally {
		await context.close();
	}
});
