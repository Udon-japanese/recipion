import { expect, test, vi } from "vitest";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import type { ShoppingRepository } from "../application/shopping-repository";
import { createShoppingItem, type ShoppingItem } from "../domain/shopping-item";
import { ShoppingList } from "./shopping-list";

function createRepository(items: readonly ShoppingItem[]): ShoppingRepository {
	return {
		list: vi.fn().mockResolvedValue([...items]),
		findById: vi.fn().mockResolvedValue(undefined),
		save: vi.fn().mockResolvedValue(undefined),
		saveAll: vi.fn().mockResolvedValue(undefined),
		remove: vi.fn().mockResolvedValue(undefined),
	};
}

test("ドラッグ操作で買い物項目を並び替える", async () => {
	const items = [
		createShoppingItem(
			{
				name: "卵",
				categoryId: "eggs",
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
				categoryId: "bakery",
				categoryAssignment: "manual",
			},
			new Date("2026-09-22T10:02:00.000Z"),
			2,
		),
	];
	const repository = createRepository(items);

	await render(<ShoppingList repository={repository} />);

	const dragHandle = page.getByRole("button", {
		name: "卵をドラッグして並び替え",
	});
	const lastItem = page.getByRole("listitem").nth(2);

	await expect.element(dragHandle).toBeVisible();
	await dragHandle.dropTo(lastItem);

	await vi.waitFor(() => {
		expect(repository.saveAll).toHaveBeenCalledWith([
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
