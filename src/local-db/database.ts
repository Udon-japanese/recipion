import Dexie, { type Table } from "dexie";
import type { ShoppingItem } from "../features/shopping/domain/shopping-item";

export class LocalDatabase extends Dexie {
	shoppingItems!: Table<ShoppingItem, string>;

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
