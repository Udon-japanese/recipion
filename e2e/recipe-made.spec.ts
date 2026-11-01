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

	test("1行だけ戻すと、その食材だけが戻り、あとで全体を戻しても、二重には戻らない", async ({
		page,
		context,
	}) => {
		const stock = await context.newPage();
		const onionBefore = await inventoryLabel(stock, "玉ねぎ");
		const cabbageBefore = await inventoryLabel(stock, "キャベツ");

		await openRecipe(page, "豚の生姜焼き");
		await page.getByRole("button", { name: "つくった！" }).click();
		await expect(page.getByText(/在庫から\d+件を引きました/)).toBeVisible({
			timeout: 20_000,
		});

		await page.getByRole("button", { name: "玉ねぎを戻す" }).click();
		await expect(
			page.getByRole("list", { name: "引いたもの" }).getByText("戻しました"),
		).toBeVisible();

		expect(await inventoryLabel(stock, "玉ねぎ")).toBe(onionBefore);
		expect(await inventoryLabel(stock, "キャベツ")).not.toBe(cabbageBefore);

		await page.getByRole("button", { name: "元に戻す" }).click();
		await expect(page.getByText("元に戻しました")).toBeVisible();

		expect(await inventoryLabel(stock, "玉ねぎ")).toBe(onionBefore);
		expect(await inventoryLabel(stock, "キャベツ")).toBe(cabbageBefore);
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
		const settings = page.getByRole("button", { name: "作ったときの設定" });
		const intoStock = page.getByRole("switch", {
			name: "できあがりも在庫に入れる",
		});

		await expect(async () => {
			if (!(await intoStock.isVisible())) {
				await settings.click();
			}
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
