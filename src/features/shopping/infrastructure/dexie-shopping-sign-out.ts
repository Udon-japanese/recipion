import { getLocalDatabase, type LocalDatabase } from "#/local-db/database";
import {
	deleteOwnedShoppingData,
	shoppingMemoTables,
} from "./read-owned-shopping-data";
import { withoutShoppingSyncTracking } from "./shopping-sync-tracking";

type UserScope = `user:${string}`;

// その人の、まだサーバーに送れていない変更の数。
export function countUnsentShoppingChanges(
	ownerScope: UserScope,
	database: LocalDatabase = getLocalDatabase(),
): Promise<number> {
	return database.shoppingSyncOutbox
		.where("ownerScope")
		.equals(ownerScope)
		.count();
}

// ログアウトするとき、この端末から、その人の買い物メモと同期の記録を消す（次にログインしたら、サーバーから受け取り直す）。
// 消すのは、その持ち主の行だけ（ゲスト・ほかの人のメモには触らない）。
// まだ送れていない変更があるときは、discardUnsent（利用者が「消してログアウト」を選んだ）でなければ、何も消さない。
// 数えるのと消すのは、1つのトランザクション（数えたあとに、別のタブで書かれた変更を、黙って消さない）。
// 結果は、消したか。
export async function clearAccountShoppingMemo(
	ownerScope: UserScope,
	{ discardUnsent }: { discardUnsent: boolean },
	database: LocalDatabase = getLocalDatabase(),
): Promise<boolean> {
	return database.transaction(
		"rw",
		[
			...shoppingMemoTables(database),
			database.shoppingSyncOutbox,
			database.shoppingSyncStates,
			database.shoppingSyncVersions,
		],
		async (tx) => {
			// 消すことを、サーバーに送る印にしない（ほかの端末のメモは、そのまま）。
			withoutShoppingSyncTracking(tx);

			if (
				!discardUnsent &&
				(await countUnsentShoppingChanges(ownerScope, database)) > 0
			) {
				return false;
			}

			await deleteOwnedShoppingData(ownerScope, database);
			await Promise.all(
				[database.shoppingSyncOutbox, database.shoppingSyncVersions].map(
					(table) => table.where("ownerScope").equals(ownerScope).delete(),
				),
			);
			await database.shoppingSyncStates.delete(ownerScope);

			return true;
		},
	);
}
