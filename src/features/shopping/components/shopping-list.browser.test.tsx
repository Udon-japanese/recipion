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

// 分類の違う項目と、購入済みが混ざっていても、一覧の中のどこへでも動かせる。
test("分類をまたいで、購入済みを飛ばして、並び替える", async () => {
	const make = (
		name: string,
		categoryId: "dairy" | "produce" | "meat",
		sortOrder: number,
		status: "pending" | "purchased" = "pending",
	) => ({
		...createShoppingItem(
			{ name, categoryId, categoryAssignment: "manual" },
			new Date(2026, 8, 22, 10, sortOrder),
			sortOrder,
		),
		status,
	});
	const repository = createFakeShoppingRepository([
		make("卵", "dairy", 0),
		make("買った牛乳", "dairy", 1, "purchased"),
		make("玉ねぎ", "produce", 2),
		make("豚肉", "meat", 3),
		make("買った鶏肉", "meat", 4, "purchased"),
		make("食パン", "dairy", 5),
	]);

	await page.viewport(900, 1600);
	await render(<ShoppingList repository={repository} />);

	const dragHandle = page.getByRole("button", { name: "卵を並べ替え" });

	await expect.element(dragHandle).toBeVisible();
	// 一覧の4つ目（食パン・別の分類）へ。
	await dragHandle.dropTo(page.getByRole("listitem").nth(3));

	await vi.waitFor(() => {
		const listed = repository.items
			.filter((item) => item.status !== "purchased")
			.sort((left, right) => left.sortOrder - right.sortOrder)
			.map((item) => item.name);

		expect(listed).toEqual(["玉ねぎ", "豚肉", "食パン", "卵"]);
	});

	// 購入済みの項目は、元の場所のまま。
	const purchased = repository.items
		.filter((item) => item.status === "purchased")
		.sort((left, right) => left.sortOrder - right.sortOrder);

	expect(purchased.map((item) => [item.name, item.sortOrder])).toEqual([
		["買った牛乳", 1],
		["買った鶏肉", 4],
	]);
});
