import Dexie, { type Table } from "dexie";
import type { InventoryCacheSnapshot } from "../features/inventory/application/inventory-cache-repository";
import type { InventoryPurchaseOutboxEntry } from "../features/inventory/application/inventory-purchase-outbox";
import type { ShoppingBranch } from "../features/shopping/domain/shopping-branch";
import type {
	ShoppingItem,
	ShoppingItemInventoryConversion,
} from "../features/shopping/domain/shopping-item";
import type { ShoppingStore } from "../features/shopping/domain/shopping-store";

// 食材ごとに、いつも買う店を覚える（nameKey は、食材名を正規化したもの）。
export type ShoppingStoreDefault = {
	nameKey: string;
	storeId: string;
};

// 食材×買う単位ごとに、ユーザーが決めた在庫換算（買う単位の呼び名と、その1単位が在庫でいくつか）を覚える。
// key は「食材名のキー＋単位のキー」。usedAt は最後に使った時刻で、食材のいつもの単位（最後に使った単位）に使う。
export type ShoppingConversionMemoryRecord = {
	key: string;
	nameKey: string;
	// 買う単位の呼び名（例：本）。単位なしで決めたときは null。
	unitLabel: string | null;
	inventoryConversion: ShoppingItemInventoryConversion;
	usedAt: number;
};

export class LocalDatabase extends Dexie {
	shoppingItems!: Table<ShoppingItem, string>;
	inventoryPurchaseOutbox!: Table<InventoryPurchaseOutboxEntry, string>;
	inventorySnapshots!: Table<InventoryCacheSnapshot, string>;
	shoppingStores!: Table<ShoppingStore, string>;
	shoppingBranches!: Table<ShoppingBranch, string>;
	shoppingStoreDefaults!: Table<ShoppingStoreDefault, string>;
	shoppingConversionMemories!: Table<ShoppingConversionMemoryRecord, string>;

	// 公開済みなので、バージョンは、まとめず、スキーマを変えるたびに足す（古いデータを直すときは .upgrade）。
	// version(1) は、公開したときの形。変えない。
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

		// 食材ごとの、在庫換算の記憶（食材×単位ごとに作り直した。version(2) の記憶は、まだ出していないので捨てる）。
		this.version(2).stores({
			shoppingConversionDefaults: "nameKey",
		});
		this.version(3).stores({
			shoppingConversionDefaults: null,
			shoppingConversionMemories: "key, nameKey",
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
