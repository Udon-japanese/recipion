import { expect, type Page, test } from "@playwright/test";

// 自分のレシピ（/recipes）の条件は URL に出さず、履歴（history state）に持つ。
// みんなのレシピ（/recipes/public）の条件は URL（q・tags）に持ち、共有できる。
// 切り替え、詳細からの戻り・進み、再読み込みで、それぞれの条件が戻ること。
test("自分のレシピの条件は履歴に、みんなのレシピの条件は URL に持ち、切り替え・戻る・進む・再読み込みで残る", async ({
	page,
}) => {
	await page.goto("/recipes");

	const ownSearch = page.getByRole("searchbox", {
		name: "自分のレシピを探す",
		exact: true,
	});
	const oyakodon = page.getByRole("link", { name: /親子丼/ });
	const nikujaga = page.getByRole("link", { name: /肉じゃが/ });

	// 画面が動き出す前は、検索の欄を出さないが、念のため、履歴に入るまで入れ直す
	// （同じ値を入れ直しても変更にならないため、いったん空にする）。
	await expect(async () => {
		await ownSearch.fill("");
		await ownSearch.fill("親子");
		expect(await storedOwnQuery(page)).toBe("親子");
	}).toPass();

	await expect(oyakodon).toBeVisible();
	await expect(nikujaga).toBeHidden();
	expect(new URL(page.url()).search).toBe("");

	// みんなのレシピ：条件は URL に出る（共有できる）。
	await page.getByRole("button", { name: "みんなのレシピ" }).click();
	await expect(page).toHaveURL(/\/recipes\/public$/);
	const publicSearch = page.getByRole("searchbox", {
		name: "レシピを探す",
		exact: true,
	});
	await publicSearch.fill("卵");
	await page.getByRole("button", { name: "探す", exact: true }).click();
	await expect(page).toHaveURL(/\/recipes\/public\?q=%E5%8D%B5$/);

	// 自分のレシピへ戻ると、自分の条件が戻り、URL には出ない。
	await page.getByRole("button", { name: "自分のレシピ" }).click();
	await expect(page).toHaveURL(/\/recipes$/);
	await expect(ownSearch).toHaveValue("親子");
	await expect(nikujaga).toBeHidden();

	// もう一度みんなのレシピへ：最後に探した条件が、URL に戻る。
	// （切り替えの読み込みが終わるまでは、前の画面が出ているので、次の画面が出るのを待ってから押す）
	await page.getByRole("button", { name: "みんなのレシピ" }).click();
	await expect(page).toHaveURL(/\/recipes\/public\?q=%E5%8D%B5$/);
	await expect(publicSearch).toHaveValue("卵");
	await page.getByRole("button", { name: "自分のレシピ" }).click();
	await expect(page).toHaveURL(/\/recipes$/);
	await expect(ownSearch).toHaveValue("親子");

	// 詳細から、戻る・進む。
	await oyakodon.click();
	await expect(
		page.getByRole("heading", { name: "親子丼", level: 2 }),
	).toBeVisible();
	await page.goBack();
	await expect(ownSearch).toHaveValue("親子");
	await expect(nikujaga).toBeHidden();

	await page.goForward();
	await expect(
		page.getByRole("heading", { name: "親子丼", level: 2 }),
	).toBeVisible();
	await page.goBack();
	await expect(ownSearch).toHaveValue("親子");

	// 再読み込み：HTML（SPA の入口）には一覧を入れず（全件を一瞬見せない）、動き出してから、履歴の条件で絞る。
	const response = await page.reload();
	const html = (await response?.text()) ?? "";
	expect(html).toContain('<div id="app">');
	expect(html).not.toContain("肉じゃが");

	await expect(ownSearch).toHaveValue("親子");
	await expect(oyakodon).toBeVisible();
	await expect(nikujaga).toBeHidden();
	expect(new URL(page.url()).search).toBe("");
});

async function storedOwnQuery(page: Page): Promise<unknown> {
	return page.evaluate(() => window.history.state?.ownRecipeSearch?.query);
}

// 一覧から別の画面へ移る読み込みの間も、前の画面（自分のレシピ）は、条件で絞ったまま。
// 移り先の履歴の項目には自分の条件がないため、それを読むと、全件が一瞬見える（実機で見つかった）。
test("自分のレシピから移る読み込みの間・戻ったとき・再読み込みで、絞り込む前の全件を一瞬も見せない", async ({
	page,
}) => {
	test.setTimeout(120_000);
	await recordUnfilteredRows(page, "肉じゃが");
	await page.goto("/recipes");

	const ownSearch = page.getByRole("searchbox", {
		name: "自分のレシピを探す",
		exact: true,
	});

	await expect(async () => {
		await ownSearch.fill("");
		await ownSearch.fill("親子");
		expect(await storedOwnQuery(page)).toBe("親子");
	}).toPass();
	await expect(page.getByRole("link", { name: /肉じゃが/ })).toBeHidden();
	await takeUnfilteredRows(page);

	// 読み込みの間を長くして、見つけやすくする。
	const cdp = await page.context().newCDPSession(page);
	await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

	await page.getByRole("link", { name: /親子丼/ }).click();
	await expect(
		page.getByRole("heading", { name: "親子丼", level: 2 }),
	).toBeVisible({ timeout: 30_000 });
	await page.goBack();
	await expect(ownSearch).toHaveValue("親子", { timeout: 30_000 });

	await page.getByRole("button", { name: "みんなのレシピ" }).click();
	await expect(
		page.getByRole("searchbox", { name: "レシピを探す", exact: true }),
	).toBeVisible({ timeout: 30_000 });
	await page.goBack();
	await expect(ownSearch).toHaveValue("親子", { timeout: 30_000 });

	await page.getByRole("link", { name: "つくった記録" }).click();
	await expect(
		page.getByRole("heading", { name: "つくった記録" }),
	).toBeVisible({ timeout: 30_000 });
	await page.goBack();
	await expect(ownSearch).toHaveValue("親子", { timeout: 30_000 });

	// 再読み込みで記録が消えるため、その前の分を取っておく。
	const seen = await takeUnfilteredRows(page);

	await page.reload();
	await expect(ownSearch).toHaveValue("親子", { timeout: 30_000 });

	seen.push(...(await takeUnfilteredRows(page)));
	expect(seen).toEqual([]);
});

// 自分のレシピの検索の欄がある画面に、name の行が出たら、記録する（ページの最初から、再読み込みのあとも）。
async function recordUnfilteredRows(page: Page, name: string) {
	await page.addInitScript((rowName) => {
		const w = window as unknown as { __unfilteredRows: string[] };
		w.__unfilteredRows = [];
		const check = () => {
			const input = document.querySelector<HTMLInputElement>(
				'input[type="search"][placeholder="レシピ名で探す"]',
			);
			const main = document.querySelector("main");

			if (!input || !main) return;

			if (
				[...main.querySelectorAll("a")].some((link) =>
					link.textContent?.includes(rowName),
				)
			) {
				w.__unfilteredRows.push(`${location.pathname} 検索語「${input.value}」`);
			}
		};

		new MutationObserver(check).observe(document, {
			subtree: true,
			childList: true,
		});
	}, name);
}

async function takeUnfilteredRows(page: Page): Promise<string[]> {
	return page.evaluate(() =>
		(window as unknown as { __unfilteredRows: string[] }).__unfilteredRows.splice(
			0,
		),
	);
}
