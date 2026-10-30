import { expect, test } from "@playwright/test";
import { inventoryLabel, openRecipe } from "./helpers";

test.describe("レシピの「つくった」と在庫", () => {
	test("つくると在庫が減り、元に戻すと、元の数量に戻る", async ({
		page,
		context,
	}) => {
		const stock = await context.newPage();
		const before = await inventoryLabel(stock, "玉ねぎ");

		await openRecipe(page, "豚の生姜焼き");
		await page.getByRole("button", { name: "つくった！" }).click();
		await expect(page.getByText(/在庫から\d+件を引きました/)).toBeVisible({
			timeout: 20_000,
		});

		// シートを開いたまま、別のタブで在庫を見る。
		expect(await inventoryLabel(stock, "玉ねぎ")).not.toBe(before);

		await page.getByRole("button", { name: "元に戻す" }).click();
		await expect(page.getByText("元に戻しました")).toBeVisible();

		expect(await inventoryLabel(stock, "玉ねぎ")).toBe(before);
	});

	test("できあがりを在庫に入れると、在庫に作り置き（1回分）が入り、元に戻すと0回分になる", async ({
		page,
		context,
	}) => {
		const stock = await context.newPage();

		await stock.goto("/inventory");
		await expect(stock.getByRole("button", { name: /^玉ねぎ、/ })).toBeVisible();

		await openRecipe(page, "豚の生姜焼き");
		// 読み込み直しの再描画で、押した直後に戻ることがある。入るまで、押し直す。
		const intoStock = page.getByRole("checkbox", {
			name: "できあがりを、在庫に入れる",
		});

		await expect(async () => {
			await intoStock.check();
			await expect(intoStock).toBeChecked();
		}).toPass();
		await page.getByRole("button", { name: "つくった！" }).click();
		await expect(page.getByText(/在庫から\d+件を引きました/)).toBeVisible({
			timeout: 20_000,
		});

		await stock.reload();
		await expect(
			stock.getByRole("button", { name: /^豚の生姜焼き、1回分、/ }),
		).toBeVisible();

		await page.getByRole("button", { name: "元に戻す" }).click();
		await expect(page.getByText("元に戻しました")).toBeVisible();

		// 戻すと、できあがりの行は、0回分で残る（行そのものは消えない）。
		await stock.reload();
		await expect(
			stock.getByRole("button", { name: /^豚の生姜焼き、0回分、/ }),
		).toBeVisible();
	});
});
