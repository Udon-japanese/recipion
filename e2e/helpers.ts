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

// 「つくった！」を押して、在庫から引いた結果が出るまで待つ。
// 画面が動き出す前や、読み込み直しの再描画の最中に押すと、押したことが受け取られないことがある（在庫を引く通信が、出ない）。
// そのときだけ、押し直す。受け取られていれば、ボタンが処理中（aria-busy）になるか、結果が出るので、二重には押さない。
export async function pressMade(page: Page) {
	const made = page.getByRole("button", { name: "つくった！" });
	const result = page.getByText(/在庫から\d+件を引きました/);

	await expect(async () => {
		if (
			!(await result.isVisible()) &&
			(await made.isVisible()) &&
			(await made.getAttribute("aria-busy")) !== "true"
		) {
			await made.click();
		}

		await expect(result).toBeVisible({ timeout: 10_000 });
	}).toPass({ timeout: 40_000 });
}

// 重なって出ているもの（シートなど）を閉じたあと、積んだ履歴を戻し終えるまで待つ（タッチ端末では、閉じると history.back() する）。
// 戻している途中で読み込み直すと、読み込み直しが取り消される（net::ERR_ABORTED）。
export async function waitForOverlayHistory(page: Page) {
	await expect
		.poll(() =>
			page.evaluate(() => {
				const state: unknown = window.history.state;

				return typeof state === "object" &&
					state !== null &&
					"__overlayDepth" in state
					? state.__overlayDepth
					: 0;
			}),
		)
		.toBe(0);
}

// 画面からログインする（確認用アカウントの、固定のコード）。
export async function loginWithDemoCode(page: Page) {
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
}

// この端末（IndexedDB）で、まだサーバーに送れていない買い物メモの変更の数。
function countUnsentShoppingChanges(page: Page) {
	return page.evaluate(
		() =>
			new Promise<number>((resolve, reject) => {
				const open = indexedDB.open("recipion-local");

				open.onerror = () => reject(open.error);
				open.onsuccess = () => {
					const request = open.result
						.transaction("shoppingSyncOutbox")
						.objectStore("shoppingSyncOutbox")
						.count();

					request.onsuccess = () => resolve(request.result);
				};
			}),
	);
}

// 買い物メモの変更を、サーバーに送り終えるまで待つ（ほかのテスト・端末に、残りを持ち越さない）。
export async function waitForShoppingSent(page: Page) {
	await expect.poll(() => countUnsentShoppingChanges(page)).toBe(0);
}

// 買い物メモの項目を、チェックした状態にする（ほかの端末でチェック済みのこともあるので、押して切り替えるのではない）。
// チェックは、保存できてから画面に出るので、locator.check() ではなく、押してから、チェックが付くのを待つ。
export async function checkShoppingItem(page: Page, name: string) {
	const checkbox = page.getByRole("checkbox", { name: `${name}をチェック` });

	if (!(await checkbox.isChecked())) {
		await checkbox.click();
	}

	await expect(checkbox).toBeChecked();
}

// 買い物メモの項目を、チェックして消す（テストで足したものの片付け）。
export async function removeShoppingItem(page: Page, name: string) {
	const checkbox = page.getByRole("checkbox", { name: `${name}をチェック` });

	await checkShoppingItem(page, name);
	await page.getByRole("button", { name: /^チェックした\d+件を削除$/ }).click();
	await page.getByRole("button", { name: "削除する" }).click();
	await expect(checkbox).toHaveCount(0);
	await waitForShoppingSent(page);
}
