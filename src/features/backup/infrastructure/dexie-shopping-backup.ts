import { getLocalDatabase } from "#/local-db/database";
import type { ShoppingBackupData } from "../domain/shopping-backup-file";

// この端末の買い物メモの5つの表を、そのまま読む（購入済みを除くのは、ファイルを作るとき）。
export async function readShoppingData() {
	const database = getLocalDatabase();

	return database.transaction(
		"r",
		[
			database.shoppingItems,
			database.shoppingStores,
			database.shoppingBranches,
			database.shoppingStoreDefaults,
			database.shoppingConversionMemories,
		],
		async () => {
			const [items, stores, branches, storeDefaults, conversionMemories] =
				await Promise.all([
					database.shoppingItems.toArray(),
					database.shoppingStores.orderBy("sortOrder").toArray(),
					database.shoppingBranches.orderBy("sortOrder").toArray(),
					database.shoppingStoreDefaults.toArray(),
					database.shoppingConversionMemories.toArray(),
				]);

			return { items, stores, branches, storeDefaults, conversionMemories };
		},
	);
}

// 買い物メモを、ファイルの内容に置き換える（購入済みの項目も含めて、いまの中身は消える）。
// 1つのトランザクションなので、途中で失敗したら、何も変わらない。
// M1（サーバー同期）で、ログイン中の置き換えをサーバーに送るときは、ここを差し替える。
export async function replaceShoppingData(
	data: ShoppingBackupData,
): Promise<void> {
	const database = getLocalDatabase();

	await database.transaction(
		"rw",
		[
			database.shoppingItems,
			database.shoppingStores,
			database.shoppingBranches,
			database.shoppingStoreDefaults,
			database.shoppingConversionMemories,
		],
		async () => {
			await Promise.all([
				database.shoppingItems.clear(),
				database.shoppingStores.clear(),
				database.shoppingBranches.clear(),
				database.shoppingStoreDefaults.clear(),
				database.shoppingConversionMemories.clear(),
			]);
			await Promise.all([
				database.shoppingItems.bulkAdd(data.items),
				database.shoppingStores.bulkAdd(data.stores),
				database.shoppingBranches.bulkAdd(data.branches),
				database.shoppingStoreDefaults.bulkAdd(data.storeDefaults),
				database.shoppingConversionMemories.bulkAdd(data.conversionMemories),
			]);
		},
	);
}
