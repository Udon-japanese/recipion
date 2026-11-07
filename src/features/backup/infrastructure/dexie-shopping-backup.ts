import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import {
	addOwnedShoppingData,
	deleteOwnedShoppingData,
	readOwnedShoppingData,
	shoppingMemoTables,
} from "#/features/shopping/infrastructure/read-owned-shopping-data";
import { getLocalDatabase } from "#/local-db/database";
import type { ShoppingBackupData } from "../domain/shopping-backup-file";

// その持ち主の買い物メモの5つの表を、そのまま読む（購入済みを除くのは、ファイルを作るとき）。
export function readShoppingData(ownerScope: InventoryPurchaseOwnerScope) {
	return readOwnedShoppingData(ownerScope);
}

// その持ち主の買い物メモを、ファイルの内容に置き換える（購入済みの項目も含めて、いまの中身は消える。ほかの持ち主のメモは触らない）。
// 1つのトランザクションなので、途中で失敗したら、何も変わらない。
// ログイン中は、消した行・足した行に、送る印が付く（shopping-sync-tracking.ts）。置き換えも、ほかの端末に伝わる。
export async function replaceShoppingData(
	ownerScope: InventoryPurchaseOwnerScope,
	data: ShoppingBackupData,
): Promise<void> {
	const database = getLocalDatabase();

	await database.transaction("rw", shoppingMemoTables(database), async () => {
		await deleteOwnedShoppingData(ownerScope, database);
		await addOwnedShoppingData(ownerScope, data, database);
	});
}
