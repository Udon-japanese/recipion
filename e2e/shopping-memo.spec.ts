import { expect, test } from "@playwright/test";

test("買い物メモに追加でき、読み込み直しても残る（ブラウザの中に保存される）", async ({
	page,
}) => {
	await page.goto("/shopping");
	await expect(page.getByText("買うものはまだありません。")).toBeVisible();

	await page.getByRole("button", { name: "買うものを入れる" }).click();

	const input = page.getByRole("combobox", { name: "買うもの" });

	await input.fill("牛乳");
	await input.press("Enter");
	await page.getByRole("button", { name: "完了" }).click();
	await expect(page.getByText("買うものはまだありません。")).toHaveCount(0);

	await page.reload();
	await expect(page.getByText("買うものはまだありません。")).toHaveCount(0);
	await expect(page.getByText("買うものはまだありません。")).toHaveCount(0);
});
