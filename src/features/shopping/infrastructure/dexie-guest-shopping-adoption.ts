import { liveQuery } from "dexie";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { getLocalDatabase } from "#/local-db/database";
import {
	hasShoppingMemoToAdopt,
	planShoppingMemoAdoption,
	type ShoppingMemoAdoption,
} from "../domain/plan-shopping-memo-adoption";
import {
	addOwnedShoppingData,
	deleteOwnedShoppingData,
	readOwnedShoppingData,
	shoppingMemoTables,
} from "./read-owned-shopping-data";

export type GuestShoppingMemoState = {
	// 移すものがあるか（まだ買っていない項目・店・条件つきのメモ）。
	hasMemo: boolean;
	// まだ買っていない項目の数（確認の文に出す）。
	pendingItemCount: number;
	// ゲストの購入の送信待ち（在庫への引き継ぎの確認が先。終わるまでは、買い物メモの引き継ぎを聞かない）。
	hasPendingGuestPurchases: boolean;
};

// ゲストの買い物メモと、ゲストの購入の送信待ちを、見張る。
export function watchGuestShoppingMemo(
	onChange: (state: GuestShoppingMemoState) => void,
	onError: (error: unknown) => void,
): () => void {
	const subscription = liveQuery(async (): Promise<GuestShoppingMemoState> => {
		const database = getLocalDatabase();
		const [guest, guestPurchases] = await Promise.all([
			readOwnedShoppingData("guest", database),
			database.inventoryPurchaseOutbox
				.where("ownerScope")
				.equals("guest")
				.count(),
		]);

		return {
			hasMemo: hasShoppingMemoToAdopt(guest),
			pendingItemCount: guest.items.filter(
				(item) => item.status !== "purchased" && !item.branchId,
			).length,
			hasPendingGuestPurchases: guestPurchases > 0,
		};
	}).subscribe({ next: onChange, error: onError });

	return () => subscription.unsubscribe();
}

// ゲストの買い物メモを、ログインした人のメモに移す（1つのトランザクション。ゲストの行は消える）。
export async function adoptGuestShoppingMemo(
	ownerScope: Extract<InventoryPurchaseOwnerScope, `user:${string}`>,
): Promise<ShoppingMemoAdoption> {
	const database = getLocalDatabase();

	return database.transaction("rw", shoppingMemoTables(database), async () => {
		const [guest, account] = await Promise.all([
			readOwnedShoppingData("guest", database),
			readOwnedShoppingData(ownerScope, database),
		]);
		const adoption = planShoppingMemoAdoption(guest, account);

		await deleteOwnedShoppingData("guest", database);
		await addOwnedShoppingData(ownerScope, adoption, database);

		return adoption;
	});
}
