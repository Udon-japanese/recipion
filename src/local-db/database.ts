import Dexie, { type Table } from "dexie";
import type { InventoryCacheSnapshot } from "../features/inventory/application/inventory-cache-repository";
import type { InventoryPurchaseOutboxEntry } from "../features/inventory/application/inventory-purchase-outbox";
import type { ShoppingBranch } from "../features/shopping/domain/shopping-branch";
import type { ShoppingItem } from "../features/shopping/domain/shopping-item";
import type { ShoppingStore } from "../features/shopping/domain/shopping-store";

// 食材ごとに、いつも買う店を覚える（nameKey は、食材名を正規化したもの）。
export type ShoppingStoreDefault = {
	nameKey: string;
	storeId: string;
};

export class LocalDatabase extends Dexie {
	shoppingItems!: Table<ShoppingItem, string>;
	inventoryPurchaseOutbox!: Table<InventoryPurchaseOutboxEntry, string>;
	inventorySnapshots!: Table<InventoryCacheSnapshot, string>;
	shoppingStores!: Table<ShoppingStore, string>;
	shoppingBranches!: Table<ShoppingBranch, string>;
	shoppingStoreDefaults!: Table<ShoppingStoreDefault, string>;

	// リリース直後なので、バージョンは 1 つにまとめている（古いデータを新しい形に直す処理は持たない）。
	// リリース後は、まとめず、スキーマを変えるたびに、バージョンを足す（.upgrade でデータを直す）。
	// 古い名前（app-local）のデータベースは、バージョンの数が合わないため、使わない（名前を変えてある）。
	constructor(databaseName = "recipion-local") {
		super(databaseName);

		this.version(1).stores({
			shoppingItems:
				"id, status, categoryId, categoryAssignment, storeId, branchId, sortOrder, createdAt, updatedAt",
			inventoryPurchaseOutbox: "id, ownerScope, status, createdAt, updatedAt",
			inventorySnapshots: "ownerScope, cachedAt",
			shoppingStores: "id, sortOrder",
			shoppingStoreDefaults: "nameKey, storeId",
			shoppingBranches: "id, sortOrder",
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
