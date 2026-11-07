import { expect, type Page, test } from "@playwright/test";
import { showMadeButton } from "./helpers";

// 見た目の基準（スナップショット）。デザインを変えたら、`nr e2e:update` で基準を撮り直す。
// 日付で変わる文字（期限・「あと○日」・レシピの登録日）と、アバターは、マスクする。
// ログインした画面のアバターは、ユーザーごとに決まる（シードのたびに、確認用ユーザーの ID が変わる）ので、マスクする。
function avatar(page: Page) {
	return page.getByRole("link", { name: /^(確認用アカウント|プロフィール)$/ });
}

test.describe("画面のスクリーンショット", () => {
	test("レシピの一覧", async ({ page }) => {
		await page.goto("/recipes");
		await expect(page.getByRole("link", { name: "肉じゃが" })).toBeVisible();
		await expect(page).toHaveScreenshot("recipes.png", {
			fullPage: true,
			mask: [avatar(page)],
		});
	});

	test("レシピの詳細", async ({ page }) => {
		await page.goto("/recipes");
		await page.getByRole("link", { name: "肉じゃが" }).click();
		await expect(page.getByRole("heading", { name: "肉じゃが" })).toBeVisible();
		await showMadeButton(page);
		// 狭い画面では、最初に見える「そろえる」のタブで撮る。
		const prepareTab = page.getByRole("button", { name: "そろえる" });
		if (await prepareTab.isVisible()) {
			await prepareTab.click();
		}
		await expect(page).toHaveScreenshot("recipe-detail.png", {
			fullPage: true,
			// 登録の日付は、シードを入れた日で変わる。
			mask: [page.getByText(/^登録：/), avatar(page)],
		});
	});

	test("在庫", async ({ page }) => {
		await page.goto("/inventory");
		await expect(page.getByRole("button", { name: /^卵、/ })).toBeVisible();
		await expect(page).toHaveScreenshot("inventory.png", {
			fullPage: true,
			mask: [page.getByRole("button", { name: /期限|あと/ }), avatar(page)],
		});
	});

	test("買い物メモ", async ({ page }) => {
		await page.goto("/shopping");
		await expect(page.getByText("買うものはまだありません。")).toBeVisible();
		await expect(page).toHaveScreenshot("shopping.png", {
			fullPage: true,
			mask: [avatar(page)],
		});
	});
});

test.describe("ログインしていない画面", () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test("ログイン", async ({ page }) => {
		await page.goto("/login");
		await expect(page.getByText("確認できました")).toBeVisible();
		await expect(page).toHaveScreenshot("login.png", { fullPage: true });
	});
});
