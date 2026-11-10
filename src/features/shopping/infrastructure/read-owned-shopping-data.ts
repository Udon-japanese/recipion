import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { getLocalDatabase, type LocalDatabase } from "#/local-db/database";
import type { ShoppingMemoData } from "../domain/plan-shopping-memo-adoption";
import {
	ownerSortRange,
	toShoppingBranch,
	toShoppingItem,
	toShoppingStore,
} from "./owned-shopping-records";

export function shoppingMemoTables(database: LocalDatabase) {
	return [
		database.shoppingItems,
		database.shoppingStores,
		database.shoppingBranches,
		database.scopedShoppingStoreDefaults,
		database.scopedShoppingConversionMemories,
		database.scopedShoppingItemMemories,
	];
}

// その持ち主の買い物メモの6つの表を、そのまま読む（1つの読み出しのトランザクション。ほかのトランザクションの中でも呼べる）。
export async function readOwnedShoppingData(
	ownerScope: InventoryPurchaseOwnerScope,
	database: LocalDatabase = getLocalDatabase(),
): Promise<ShoppingMemoData> {
	const [lower, upper] = ownerSortRange(ownerScope);

	return database.transaction("r", shoppingMemoTables(database), async () => {
		const [
			items,
			stores,
			branches,
			storeDefaults,
			conversionMemories,
			itemMemories,
		] = await Promise.all([
			database.shoppingItems
				.where("[ownerScope+sortOrder]")
				.between(lower, upper, true, true)
				.toArray(),
			database.shoppingStores
				.where("[ownerScope+sortOrder]")
				.between(lower, upper, true, true)
				.toArray(),
			database.shoppingBranches
				.where("[ownerScope+sortOrder]")
				.between(lower, upper, true, true)
				.toArray(),
			database.scopedShoppingStoreDefaults
				.where("ownerScope")
				.equals(ownerScope)
				.toArray(),
			database.scopedShoppingConversionMemories
				.where("ownerScope")
				.equals(ownerScope)
				.toArray(),
			database.scopedShoppingItemMemories
				.where("ownerScope")
				.equals(ownerScope)
				.toArray(),
		]);

		return {
			items: items.map(toShoppingItem),
			stores: stores.map(toShoppingStore),
			branches: branches.map(toShoppingBranch),
			storeDefaults: storeDefaults.map(({ nameKey, storeId }) => ({
				nameKey,
				storeId,
			})),
			conversionMemories: conversionMemories.map(
				({ ownerScope: _ownerScope, ...memory }) => memory,
			),
			itemMemories: itemMemories.map(
				({ ownerScope: _ownerScope, ...memory }) => memory,
			),
		};
	});
}

// その持ち主の買い物メモを、すべて消す（呼び出す側のトランザクションの中で使う）。
export async function deleteOwnedShoppingData(
	ownerScope: InventoryPurchaseOwnerScope,
	database: LocalDatabase,
): Promise<void> {
	await Promise.all(
		shoppingMemoTables(database).map((table) =>
			table.where("ownerScope").equals(ownerScope).delete(),
		),
	);
}

// 買い物メモの行を、その持ち主のものとして足す（呼び出す側のトランザクションの中で使う）。
export async function addOwnedShoppingData(
	ownerScope: InventoryPurchaseOwnerScope,
	data: ShoppingMemoData,
	database: LocalDatabase,
): Promise<void> {
	const owner = { ownerScope };

	await Promise.all([
		database.shoppingItems.bulkAdd(
			data.items.map((item) => ({ ...item, ...owner })),
		),
		database.shoppingStores.bulkAdd(
			data.stores.map((store) => ({ ...store, ...owner })),
		),
		database.shoppingBranches.bulkAdd(
			data.branches.map((branch) => ({ ...branch, ...owner })),
		),
		database.scopedShoppingStoreDefaults.bulkAdd(
			data.storeDefaults.map((entry) => ({ ...entry, ...owner })),
		),
		database.scopedShoppingConversionMemories.bulkAdd(
			data.conversionMemories.map((memory) => ({ ...memory, ...owner })),
		),
		database.scopedShoppingItemMemories.bulkAdd(
			data.itemMemories.map((memory) => ({ ...memory, ...owner })),
		),
	]);
}
