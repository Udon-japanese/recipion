import { expect, test } from "@playwright/test";

// 見た目の基準（スナップショット）。デザインを変えたら、`nr e2e:update` で基準を撮り直す。
// 日付で変わる文字（期限・「あと○日」）は、マスクする。
test.describe("画面のスクリーンショット", () => {
	test("レシピの一覧", async ({ page }) => {
		await page.goto("/recipes");
		await expect(page.getByRole("link", { name: "肉じゃが" })).toBeVisible();
		await expect(page).toHaveScreenshot("recipes.png", { fullPage: true });
	});

	test("レシピの詳細", async ({ page }) => {
		await page.goto("/recipes");
		await page.getByRole("link", { name: "肉じゃが" }).click();
		await expect(page.getByRole("heading", { name: "肉じゃが" })).toBeVisible();
		await expect(page.getByRole("button", { name: "つくった！" })).toBeEnabled();
		await expect(page).toHaveScreenshot("recipe-detail.png", { fullPage: true });
	});

	test("在庫", async ({ page }) => {
		await page.goto("/inventory");
		await expect(page.getByRole("button", { name: /^卵、/ })).toBeVisible();
		await expect(page).toHaveScreenshot("inventory.png", {
			fullPage: true,
			mask: [page.getByRole("button", { name: /期限|あと/ })],
		});
	});

	test("買い物メモ", async ({ page }) => {
		await page.goto("/shopping");
		await expect(page.getByText("買うものはまだありません。")).toBeVisible();
		await expect(page).toHaveScreenshot("shopping.png", { fullPage: true });
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
