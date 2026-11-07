import { expect, type Page, test } from "@playwright/test";

const recipeName = "親子丼";

async function openEditor(page: Page) {
	await page.getByRole("link", { name: "編集" }).click();

	// 「できあがりの量を増やす・減らす」のボタンも名前に「できあがり」を含むので、入力欄だけを、名前の完全一致で選ぶ。
	const yieldInput = page.getByRole("textbox", {
		name: "できあがり",
		exact: true,
	});

	await expect(yieldInput).toBeVisible();

	return yieldInput;
}

async function saveAndWaitForView(page: Page) {
	await page.getByRole("button", { name: "レシピを保存" }).click();
	await expect(
		page.getByRole("heading", { name: recipeName, level: 2 }),
	).toBeVisible({ timeout: 20_000 });
}

test.describe("レシピの編集", () => {
	// 一度開いた編集画面に戻ったとき、前に読み込んだ（保存前の）値で始まると、保存で上書きしてしまう。
	test("保存したあとに、もう一度編集を開くと、保存した値で始まる", async ({
		page,
	}) => {
		await page.goto("/recipes");
		await page.getByRole("link", { name: recipeName }).click();

		const yieldInput = await openEditor(page);
		const before = await yieldInput.inputValue();

		await page.getByRole("button", { name: "できあがりの量を増やす" }).click();
		await expect(yieldInput).not.toHaveValue(before);
		const after = await yieldInput.inputValue();
		await saveAndWaitForView(page);

		const reopened = await openEditor(page);

		await expect(reopened).toHaveValue(after);

		// シードの値に戻す（ほかのテストのため）。
		await page.getByRole("button", { name: "できあがりの量を減らす" }).click();
		await expect(reopened).toHaveValue(before);
		await saveAndWaitForView(page);
	});
});
