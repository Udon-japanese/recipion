import { expect, type Page } from "@playwright/test";

// 在庫の画面で、食材の行（ボタン）の読み上げ名（「玉ねぎ、約 3個、机の上」）を返す。
export async function inventoryLabel(page: Page, name: string) {
	await page.goto("/inventory");

	const row = page.getByRole("button", { name: new RegExp(`^${name}、`) });

	await expect(row).toBeVisible();

	return row.getAttribute("aria-label").then(
		async (label) => label ?? (await row.innerText()),
	);
}

// シードのレシピを開く。
export async function openRecipe(page: Page, name: string) {
	await page.goto("/recipes");
	await page.getByRole("link", { name }).click();
	await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
	// 画面が読み込まれてから操作する（その前のクリックは、効かないことがある）。
	await expect(page.getByRole("button", { name: "つくった！" })).toBeEnabled();
}
