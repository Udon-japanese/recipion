import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { createFakeShoppingRepository } from "#/test/fakes/fake-shopping-repository";
import { createShoppingItem } from "../domain/shopping-item";
import { ShoppingList } from "./shopping-list";

test("ドラッグ操作で買い物項目を並び替える", async () => {
	const items = [
		createShoppingItem(
			{
				name: "卵",
				categoryId: "dairy",
				categoryAssignment: "manual",
			},
			new Date("2026-09-22T10:00:00.000Z"),
			0,
		),
		createShoppingItem(
			{
				name: "牛乳",
				categoryId: "dairy",
				categoryAssignment: "manual",
			},
			new Date("2026-09-22T10:01:00.000Z"),
			1,
		),
		createShoppingItem(
			{
				name: "食パン",
				categoryId: "dairy",
				categoryAssignment: "manual",
			},
			new Date("2026-09-22T10:02:00.000Z"),
			2,
		),
	];
	const repository = createFakeShoppingRepository(items);

	// 入力フォームが縦に長くなっても、並び替えの項目が、画面の外に出ないようにする。
	await page.viewport(900, 1600);
	await render(<ShoppingList repository={repository} />);

	const dragHandle = page.getByRole("button", {
		name: "卵を並べ替え",
	});
	const lastItem = page.getByRole("listitem").nth(2);
	// 同じ分類（牛乳・乳製品）の中で動かす。

	await expect.element(dragHandle).toBeVisible();
	await dragHandle.dropTo(lastItem);

	await vi.waitFor(() => {
		expect(repository.items).toEqual([
			expect.objectContaining({
				name: "牛乳",
				sortOrder: 0,
			}),
			expect.objectContaining({
				name: "食パン",
				sortOrder: 1,
			}),
			expect.objectContaining({
				name: "卵",
				sortOrder: 2,
			}),
		]);
	});

	await expect
		.element(page.getByRole("checkbox").nth(0))
		.toHaveAccessibleName("牛乳をチェック");
	await expect
		.element(page.getByRole("checkbox").nth(1))
		.toHaveAccessibleName("食パンをチェック");
	await expect
		.element(page.getByRole("checkbox").nth(2))
		.toHaveAccessibleName("卵をチェック");
});
