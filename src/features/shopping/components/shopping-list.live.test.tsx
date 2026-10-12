import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import { createShoppingItem } from "../domain/shopping-item";
import { dexieShoppingRepository } from "../infrastructure/dexie-shopping-repository";
import { ShoppingList } from "./shopping-list";

beforeEach(async () => {
	const database = getLocalDatabase();

	await database.shoppingItems.clear();
	await database.shoppingBranches.clear();
	await database.shoppingStores.clear();
	await database.shoppingStoreDefaults.clear();
});

afterEach(() => {
	localStorage.clear();
});

describe("ShoppingList のライブデータ", () => {
	it("画面の外（別のタブなど）で保存先が書き換わっても、再読み込みなしで反映される", async () => {
		render(<ShoppingList repository={dexieShoppingRepository} />);

		await screen.findByText("買うものはまだありません。");

		const item = createShoppingItem({
			name: "卵",
			quantity: 6,
			unitLabel: "個",
		});

		await act(async () => {
			await getLocalDatabase().shoppingItems.put(item);
		});

		expect(
			await screen.findByRole("checkbox", { name: "卵をチェック" }),
		).toBeInTheDocument();

		await act(async () => {
			await getLocalDatabase().shoppingItems.delete(item.id);
		});

		expect(
			await screen.findByText("買うものはまだありません。"),
		).toBeInTheDocument();
	});
});
