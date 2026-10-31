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
	await showMadeButton(page);
}

// 「つくった！」が押せるまで待つ。狭い画面では「作りかた」のタブの中にあるので、先に切り替える。
// 画面が読み込まれる前のクリックは効かないことがあるので、押せるようになるまで押し直す。
export async function showMadeButton(page: Page) {
	const cookTab = page.getByRole("button", { name: "作りかた" });
	const made = page.getByRole("button", { name: "つくった！" });

	await expect(async () => {
		if (await cookTab.isVisible()) {
			await cookTab.click();
		}
		await expect(made).toBeEnabled({ timeout: 1_000 });
	}).toPass();
}
