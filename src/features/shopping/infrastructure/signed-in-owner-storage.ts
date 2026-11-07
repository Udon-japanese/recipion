import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { storageKeys } from "#/local-storage/keys";
import { defineStorageItem } from "#/local-storage/storage-item";

type UserScope = Extract<InventoryPurchaseOwnerScope, `user:${string}`>;

function isUserScope(value: string): value is UserScope {
	return value.startsWith("user:");
}

// この端末で、いまログインしている人。オフラインでログイン状態を確かめられないときに、その人の買い物メモを見せるために使う。
// ログアウトしたとき・未ログインと確かめたときは消す（共用の端末で、次の人に、前の人のメモを見せない）。
export const signedInOwnerStorage = defineStorageItem<UserScope | null>({
	key: storageKeys.shoppingSignedInOwner,
	defaultValue: null,
	parse: (raw) => (isUserScope(raw) ? raw : undefined),
	serialize: (ownerScope) => ownerScope ?? "",
});
