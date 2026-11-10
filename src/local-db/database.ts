import Dexie, { type Table } from "dexie";
import type { IngredientDictionarySnapshot } from "../features/ingredients/application/ingredient-dictionary-cache";
import type { InventoryCacheSnapshot } from "../features/inventory/application/inventory-cache-repository";
import type {
	InventoryPurchaseOutboxEntry,
	InventoryPurchaseOwnerScope,
} from "../features/inventory/application/inventory-purchase-outbox";
import type { ShoppingBranch } from "../features/shopping/domain/shopping-branch";
import type {
	ShoppingItem,
	ShoppingItemInventoryConversion,
} from "../features/shopping/domain/shopping-item";
import type { ShoppingItemMemory } from "../features/shopping/domain/shopping-item-memory";
import type { ShoppingStore } from "../features/shopping/domain/shopping-store";
import type {
	ShoppingRecordKind,
	ShoppingSyncOutboxEntry,
} from "../features/shopping/domain/shopping-sync-record";
import { createShoppingSyncTrackingMiddleware } from "../features/shopping/infrastructure/shopping-sync-tracking";

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

// 買い物メモの行は、持ち主（ゲスト／ログインした人）ごとに分ける。同じ端末でも、別の人のメモは見えない。
export type Owned<T> = T & { ownerScope: InventoryPurchaseOwnerScope };

export type ShoppingItemRecord = Owned<ShoppingItem>;
export type ShoppingStoreRecord = Owned<ShoppingStore>;
export type ShoppingBranchRecord = Owned<ShoppingBranch>;
export type ShoppingStoreDefaultRecord = Owned<ShoppingStoreDefault>;
export type ScopedShoppingConversionMemoryRecord =
	Owned<ShoppingConversionMemoryRecord>;
export type ShoppingItemMemoryRecord = Owned<ShoppingItemMemory>;

// ログインした人の買い物メモの、サーバーから受け取り済みの版（初めて同期するまでは、行がない）。
export type ShoppingSyncStateRecord = {
	ownerScope: `user:${string}`;
	cursor: number;
};

// ログインした人の買い物メモの1行について、端末が知っているサーバーの版。
// 送るときに、変えたもとの版として添える（別の端末が先に変えていたら、サーバーが当てない）。
export type ShoppingSyncVersionRecord = {
	ownerScope: `user:${string}`;
	kind: ShoppingRecordKind;
	id: string;
	version: number;
	// 送ったが、返事を受け取れなかった変更（届いていたら、その変更の上に、次の変更を当ててよい）。
	unackedChangeIds: string[];
};

export class LocalDatabase extends Dexie {
	shoppingItems!: Table<ShoppingItemRecord, string>;
	inventoryPurchaseOutbox!: Table<InventoryPurchaseOutboxEntry, string>;
	inventorySnapshots!: Table<InventoryCacheSnapshot, string>;
	shoppingStores!: Table<ShoppingStoreRecord, string>;
	shoppingBranches!: Table<ShoppingBranchRecord, string>;
	// 主キーは [持ち主, 食材名のキー]。
	scopedShoppingStoreDefaults!: Table<
		ShoppingStoreDefaultRecord,
		[string, string]
	>;
	// 主キーは [持ち主, 食材×単位のキー]。
	scopedShoppingConversionMemories!: Table<
		ScopedShoppingConversionMemoryRecord,
		[string, string]
	>;
	// 主キーは [持ち主, 食材名のキー]。
	scopedShoppingItemMemories!: Table<
		ShoppingItemMemoryRecord,
		[string, string]
	>;
	ingredientDictionaries!: Table<IngredientDictionarySnapshot, string>;
	// 主キーは [持ち主, 種類, ID]。
	shoppingSyncOutbox!: Table<ShoppingSyncOutboxEntry, [string, string, string]>;
	shoppingSyncStates!: Table<ShoppingSyncStateRecord, string>;
	// 主キーは [持ち主, 種類, ID]。
	shoppingSyncVersions!: Table<
		ShoppingSyncVersionRecord,
		[string, string, string]
	>;

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
		// ユーザーの食材辞書の控え（所有者ごと。オフラインの補完と照合に使う）。
		this.version(4).stores({
			ingredientDictionaries: "ownerScope",
		});
		// 買い物メモを、持ち主ごとに分けた（それまでのメモは、ゲストのものにする。ログインすると、引き継ぐかを聞く）。
		// いつも買う店・換算の記憶は、主キーに持ち主を入れるため、表を作り直す（Dexie は主キーを変えられない）。
		// 消す表も、この版の upgrade の中では読める（Dexie の updateTablesAndIndexes）。
		this.version(5)
			.stores({
				shoppingItems:
					"id, ownerScope, [ownerScope+sortOrder], [ownerScope+status], status, categoryId, categoryAssignment, storeId, branchId, sortOrder, createdAt, updatedAt",
				shoppingStores: "id, ownerScope, [ownerScope+sortOrder], sortOrder",
				shoppingBranches: "id, ownerScope, [ownerScope+sortOrder], sortOrder",
				shoppingStoreDefaults: null,
				shoppingConversionMemories: null,
				scopedShoppingStoreDefaults:
					"[ownerScope+nameKey], ownerScope, storeId",
				scopedShoppingConversionMemories: "[ownerScope+key], ownerScope",
			})
			.upgrade(async (transaction) => {
				const guest = { ownerScope: "guest" as const };

				await Promise.all([
					transaction.table("shoppingItems").toCollection().modify(guest),
					transaction.table("shoppingStores").toCollection().modify(guest),
					transaction.table("shoppingBranches").toCollection().modify(guest),
				]);

				const [defaults, memories] = await Promise.all([
					transaction
						.table<ShoppingStoreDefault>("shoppingStoreDefaults")
						.toArray(),
					transaction
						.table<ShoppingConversionMemoryRecord>("shoppingConversionMemories")
						.toArray(),
				]);

				await Promise.all([
					transaction
						.table("scopedShoppingStoreDefaults")
						.bulkAdd(defaults.map((entry) => ({ ...entry, ...guest }))),
					transaction
						.table("scopedShoppingConversionMemories")
						.bulkAdd(memories.map((memory) => ({ ...memory, ...guest }))),
				]);
			});
		// 買い物メモのサーバー同期：送っていない行の印、受け取り済みの版、行ごとに知っているサーバーの版。
		this.version(6).stores({
			shoppingSyncOutbox: "[ownerScope+kind+id], ownerScope",
			shoppingSyncStates: "ownerScope",
			shoppingSyncVersions: "[ownerScope+kind+id], ownerScope",
		});
		// 食材ごとの、いつもの買い方（前回の数量・単位・カテゴリ）。
		this.version(7).stores({
			scopedShoppingItemMemories: "[ownerScope+nameKey], ownerScope",
		});

		// 買い物メモの行を書いたら、同じトランザクションで、送る印を付ける。
		this.use(createShoppingSyncTrackingMiddleware());
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
