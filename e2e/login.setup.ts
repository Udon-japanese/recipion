import { test as setup } from "@playwright/test";
import { loginWithDemoCode } from "./helpers";

// 画面から実際にログインして、その状態（cookie）を保存する。ほかのテストは、この状態を使い回す。
// ログインの画面操作を確かめるのは、ここ（と、ログアウトのあとにログインし直す、買い物メモの同期のテスト）だけ
// （コードの生成・期限・回数制限は、単体テストで保証している）。
setup("メールアドレスと6桁のコードでログインできる", async ({ page }) => {
	await loginWithDemoCode(page);
	await page.context().storageState({ path: "e2e/.auth/user.json" });
});
