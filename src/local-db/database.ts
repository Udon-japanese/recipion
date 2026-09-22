import Dexie, { type Table } from "dexie";
import type { InventoryPurchaseOutboxEntry } from "../features/inventory/infrastructure/inventory-purchase-outbox";
import type { ShoppingItem } from "../features/shopping/domain/shopping-item";

type MigratingShoppingItem = Omit<
	ShoppingItem,
	"categoryId" | "categoryAssignment" | "inventoryConversion"
> & {
	categoryId?: ShoppingItem["categoryId"] | "tofu-noodles";
	categoryAssignment?: ShoppingItem["categoryAssignment"];
	inventoryConversion?: ShoppingItem["inventoryConversion"];
};

export class LocalDatabase extends Dexie {
	shoppingItems!: Table<ShoppingItem, string>;
	inventoryPurchaseOutbox!: Table<InventoryPurchaseOutboxEntry, string>;

	constructor(databaseName = "app-local") {
		super(databaseName);

		this.version(1).stores({
			shoppingItems: "id, status, createdAt, updatedAt",
		});

		this.version(2)
			.stores({
				shoppingItems: "id, status, sortOrder, createdAt, updatedAt",
			})
			.upgrade(async (transaction) => {
				const shoppingItems = transaction.table<ShoppingItem, string>(
					"shoppingItems",
				);
				const existingItems = await shoppingItems
					.orderBy("createdAt")
					.toArray();

				await Promise.all(
					existingItems.map((item, index) =>
						shoppingItems.update(item.id, {
							sortOrder: index,
						}),
					),
				);
			});

		this.version(3)
			.stores({
				shoppingItems:
					"id, status, categoryId, sortOrder, createdAt, updatedAt",
			})
			.upgrade(async (transaction) => {
				const shoppingItems = transaction.table<MigratingShoppingItem, string>(
					"shoppingItems",
				);

				await shoppingItems.toCollection().modify((item) => {
					item.categoryId ??= null;
				});
			});

		this.version(4)
			.stores({
				shoppingItems:
					"id, status, categoryId, categoryAssignment, sortOrder, createdAt, updatedAt",
			})
			.upgrade(async (transaction) => {
				const shoppingItems = transaction.table<MigratingShoppingItem, string>(
					"shoppingItems",
				);

				await shoppingItems.toCollection().modify((item) => {
					item.categoryAssignment = item.categoryId == null ? null : "manual";
				});
			});

		this.version(5)
			.stores({
				shoppingItems:
					"id, status, categoryId, categoryAssignment, sortOrder, createdAt, updatedAt",
			})
			.upgrade(async (transaction) => {
				const shoppingItems = transaction.table<MigratingShoppingItem, string>(
					"shoppingItems",
				);

				await shoppingItems.toCollection().modify((item) => {
					if (item.categoryId === "tofu-noodles") {
						item.categoryId = "chilled";
					}
				});
			});

		this.version(6).stores({
			shoppingItems:
				"id, status, categoryId, categoryAssignment, sortOrder, createdAt, updatedAt",
			inventoryPurchaseOutbox: "id, ownerScope, status, createdAt, updatedAt",
		});

		this.version(7)
			.stores({
				shoppingItems:
					"id, status, categoryId, categoryAssignment, sortOrder, createdAt, updatedAt",
				inventoryPurchaseOutbox: "id, ownerScope, status, createdAt, updatedAt",
			})
			.upgrade(async (transaction) => {
				const shoppingItems = transaction.table<MigratingShoppingItem, string>(
					"shoppingItems",
				);

				await shoppingItems.toCollection().modify((item) => {
					item.inventoryConversion ??= null;
				});
			});
	}
}

let database: LocalDatabase | undefined;

export function getLocalDatabase(): LocalDatabase {
	if (typeof window === "undefined") {
		throw new Error("ローカルDBはブラウザからのみ利用できます");
	}

	database ??= new LocalDatabase();

	return database;
}
