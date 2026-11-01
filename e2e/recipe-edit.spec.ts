import { expect, type Page, test } from "@playwright/test";

const recipeName = "親子丼";

async function openEditor(page: Page) {
	await page.getByRole("link", { name: "編集" }).click();

	const servings = page.getByLabel("何人分");

	await expect(servings).toBeVisible();

	return servings;
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

		const servings = await openEditor(page);
		const before = Number(await servings.inputValue());

		await page.getByRole("button", { name: "人数を増やす" }).click();
		await expect(servings).toHaveValue(String(before + 1));
		await saveAndWaitForView(page);

		const reopened = await openEditor(page);

		await expect(reopened).toHaveValue(String(before + 1));

		// シードの値に戻す（ほかのテストのため）。
		await page.getByRole("button", { name: "人数を減らす" }).click();
		await expect(reopened).toHaveValue(String(before));
		await saveAndWaitForView(page);
	});
});
