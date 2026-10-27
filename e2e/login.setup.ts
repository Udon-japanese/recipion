import { expect, test as setup } from "@playwright/test";

// 画面から実際にログインして、その状態（cookie）を保存する。ほかのテストは、この状態を使い回す。
// ログインの画面操作を確かめるのは、ここだけ（コードの生成・期限・回数制限は、単体テストで保証している）。
setup("メールアドレスと6桁のコードでログインできる", async ({ page }) => {
	const email = process.env.DEMO_LOGIN_EMAIL as string;
	const code = process.env.DEMO_LOGIN_CODE as string;

	await page.goto("/login");
	// 画面が読み込まれ、Turnstile（開発用のテストキー）が通るまで待つ。その前に入力すると、再描画で消える。
	await expect(page.getByText("確認できました")).toBeVisible();
	await page.getByLabel("メールアドレス").fill(email);
	await page.getByRole("button", { name: "コードを送る" }).click();

	await expect(page.getByText(`${email} に`)).toBeVisible();

	// 6 桁が揃うと、自動で確認される。
	await page.getByLabel(/ログイン用コード/).first().click();
	await page.keyboard.type(code);

	await expect(page).not.toHaveURL(/\/login/);

	await page.context().storageState({ path: "e2e/.auth/user.json" });
});
