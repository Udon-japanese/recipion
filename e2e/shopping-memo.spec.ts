import { expect, test } from "@playwright/test";
import { removeShoppingItem, waitForOverlayHistory } from "./helpers";

test("買い物メモに追加でき、読み込み直しても残る（ブラウザの中に保存される）", async ({
	page,
}) => {
	// ログインしているので、メモはサーバーにも送られ、ほかのテストのブラウザにも届く。名前に、実行ごとの印を付ける。
	const name = `牛乳${Date.now()}`;

	await page.goto("/shopping");
	await expect(page.getByText("買うものはまだありません。")).toBeVisible();

	// 入口は、デスクトップ幅では「追加」、スマホ幅では右下の「＋」（買うものを入れる）。
	// 上の「まだありません」が出たあとなので、画面幅の判定は済んでいる。
	await page
		.getByRole("button", { name: /^(追加|買うものを入れる)$/ })
		.click();

	const input = page.getByRole("combobox", { name: "買うもの" });

	await input.fill(name);
	await input.press("Enter");
	await page.getByRole("button", { name: "完了" }).click();
	await expect(page.getByText("買うものはまだありません。")).toHaveCount(0);
	await waitForOverlayHistory(page);

	await page.reload();
	await expect(page.getByText("買うものはまだありません。")).toHaveCount(0);

	// 片付け（ほかのテストのブラウザに、残さない）。
	await removeShoppingItem(page, name);
});
