import Dexie, { type Table } from "dexie";
import type { ShoppingItem } from "../features/shopping/domain/shopping-item";

class LocalDatabase extends Dexie {
	shoppingItems!: Table<ShoppingItem, string>;

	constructor() {
		super("app-local");

		this.version(1).stores({
			shoppingItems: "id, status, createdAt, updatedAt",
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
