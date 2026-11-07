import {
	deleteOwnedShoppingData,
	shoppingMemoTables,
} from "#/features/shopping/infrastructure/read-owned-shopping-data";
import { withoutShoppingSyncTracking } from "#/features/shopping/infrastructure/shopping-sync-tracking";
import { getLocalDatabase, type LocalDatabase } from "./database";

type UserScope = `user:${string}`;

// その人の、まだサーバーに送れていない変更（この端末にしかない）。
// - shoppingChangeIds：買い物メモの変更（書くたびに変わる印）。
// - purchaseIds：在庫に入れる買い物（送信待ちと、送れなかったもの）。
export type UnsentAccountChanges = {
	shoppingChangeIds: string[];
	purchaseIds: string[];
};

export const noUnsentAccountChanges: UnsentAccountChanges = {
	shoppingChangeIds: [],
	purchaseIds: [],
};

export function countUnsentAccountChanges(changes: UnsentAccountChanges) {
	return changes.shoppingChangeIds.length + changes.purchaseIds.length;
}

function accountTables(database: LocalDatabase) {
	return [
		...shoppingMemoTables(database),
		database.shoppingSyncOutbox,
		database.shoppingSyncStates,
		database.shoppingSyncVersions,
		database.inventoryPurchaseOutbox,
		database.inventorySnapshots,
		database.ingredientDictionaries,
	];
}

async function readUnsent(
	ownerScope: UserScope,
	database: LocalDatabase,
): Promise<UnsentAccountChanges> {
	const [shopping, purchases] = await Promise.all([
		database.shoppingSyncOutbox
			.where("ownerScope")
			.equals(ownerScope)
			.toArray(),
		database.inventoryPurchaseOutbox
			.where("ownerScope")
			.equals(ownerScope)
			.toArray(),
	]);

	return {
		shoppingChangeIds: shopping.map((entry) => entry.changeId),
		purchaseIds: purchases.map((entry) => entry.id),
	};
}

// その人の、まだ送れていない変更を読む（ログアウトの前に、利用者に件数を見せる）。
export function findUnsentAccountChanges(
	ownerScope: UserScope,
	database: LocalDatabase = getLocalDatabase(),
): Promise<UnsentAccountChanges> {
	return database.transaction(
		"r",
		[database.shoppingSyncOutbox, database.inventoryPurchaseOutbox],
		() => readUnsent(ownerScope, database),
	);
}

function isCoveredBy(
	current: UnsentAccountChanges,
	confirmed: UnsentAccountChanges,
) {
	const shopping = new Set(confirmed.shoppingChangeIds);
	const purchases = new Set(confirmed.purchaseIds);

	return (
		current.shoppingChangeIds.every((changeId) => shopping.has(changeId)) &&
		current.purchaseIds.every((id) => purchases.has(id))
	);
}

// ログアウトしたあと、この端末から、その人のデータを消す（共用の端末で、次の人に残さない。次にログインしたら、サーバーから受け取り直す）。
// 消すもの：買い物メモと同期の記録、在庫に入れる買い物、在庫の控え、食材辞書の控え。どれも、その持ち主の行だけ（ゲスト・ほかの人には触らない）。
// 端末の設定（localStorage）と、期限の目安の日数は、持ち主で分かれていないので、残す。
// discarded：利用者が「消してログアウト」で捨てると決めた、送れていない変更（聞いていなければ、空）。
// それ以外に送れていない変更があれば（読んだあとに、別のタブなどで増えた）、何も消さない。
// 確かめるのと消すのは、1つのトランザクション。結果は、消したか。
export function clearAccountLocalData(
	ownerScope: UserScope,
	discarded: UnsentAccountChanges,
	database: LocalDatabase = getLocalDatabase(),
): Promise<boolean> {
	return database.transaction("rw", accountTables(database), async (tx) => {
		// 消すことを、サーバーに送る印にしない（ほかの端末のメモは、そのまま）。
		withoutShoppingSyncTracking(tx);

		if (!isCoveredBy(await readUnsent(ownerScope, database), discarded)) {
			return false;
		}

		await deleteOwnedShoppingData(ownerScope, database);
		await Promise.all([
			...[
				database.shoppingSyncOutbox,
				database.shoppingSyncVersions,
				database.inventoryPurchaseOutbox,
			].map((table) => table.where("ownerScope").equals(ownerScope).delete()),
			database.shoppingSyncStates.delete(ownerScope),
			database.inventorySnapshots.delete(ownerScope),
			database.ingredientDictionaries.delete(ownerScope),
		]);

		return true;
	});
}
