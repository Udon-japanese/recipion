import { afterEach, describe, expect, it } from "vitest";
import { LocalDatabase } from "#/local-db/database";
import {
	createShoppingItem,
	toggleShoppingItem,
} from "../domain/shopping-item";
import { confirmCheckedShoppingItemsPurchase } from "./dexie-shopping-purchase";

const databases: LocalDatabase[] = [];

function createDatabase(): LocalDatabase {
	const database = new LocalDatabase(
		`shopping-purchase-test-${crypto.randomUUID()}`,
	);

	databases.push(database);

	return database;
}

function createCheckedHotcakeMix() {
	return toggleShoppingItem(
		createShoppingItem({
			name: "ホットケーキミックス",
			quantity: 2,
			unitLabel: "袋",
			inventoryConversion: {
				inputUnitCode: "bag",
				stockUnitCode: "g",
				stockUnitLabel: "g",
				stockQuantityPerInputUnit: 200,
				trackingMode: "estimated",
			},
		}),
	);
}

afterEach(async () => {
	await Promise.all(
		databases.splice(0).map(async (database) => {
			database.close();
			await database.delete();
		}),
	);
});

describe("confirmCheckedShoppingItemsPurchase", () => {
	it("チェック済み商品を購入済みにしてoutboxへ追加する", async () => {
		const database = createDatabase();
		const checkedItem = createCheckedHotcakeMix();

		await database.shoppingItems.add(checkedItem);

		const result = await confirmCheckedShoppingItemsPurchase(
			"guest",
			database,
			new Date("2026-09-22T19:00:00.000Z"),
		);

		expect(result).toEqual({
			status: "confirmed",
			items: [
				expect.objectContaining({
					id: checkedItem.id,
					status: "purchased",
					updatedAt: "2026-09-22T19:00:00.000Z",
				}),
			],
		});

		await expect(database.shoppingItems.get(checkedItem.id)).resolves.toEqual(
			expect.objectContaining({
				id: checkedItem.id,
				status: "purchased",
			}),
		);

		const outboxEntries = await database.inventoryPurchaseOutbox.toArray();

		expect(outboxEntries).toHaveLength(1);
		expect(outboxEntries[0]).toEqual(
			expect.objectContaining({
				ownerScope: "guest",
				status: "pending",
				payload: expect.objectContaining({
					shoppingItemId: checkedItem.id,
					ingredientName: "ホットケーキミックス",
					inputQuantity: 2,
					stockQuantityPerInputUnit: 200,
				}),
			}),
		);
	});

	it("在庫換算がない商品があれば何も保存しない", async () => {
		const database = createDatabase();
		const checkedItem = toggleShoppingItem(
			createShoppingItem({
				name: "謎の商品",
			}),
		);

		await database.shoppingItems.add(checkedItem);

		const result = await confirmCheckedShoppingItemsPurchase("guest", database);

		expect(result).toEqual({
			status: "missing-conversion",
			items: [checkedItem],
		});

		await expect(database.shoppingItems.get(checkedItem.id)).resolves.toEqual(
			checkedItem,
		);

		await expect(database.inventoryPurchaseOutbox.count()).resolves.toBe(0);
	});

	it("チェック済み商品がなければ何も変更しない", async () => {
		const database = createDatabase();
		const pendingItem = createShoppingItem({
			name: "卵",
		});

		await database.shoppingItems.add(pendingItem);

		const result = await confirmCheckedShoppingItemsPurchase("guest", database);

		expect(result).toEqual({
			status: "nothing-to-confirm",
		});

		await expect(database.inventoryPurchaseOutbox.count()).resolves.toBe(0);
	});
});
