import Dexie from "dexie";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type {
	ShoppingBranchRecord,
	ShoppingItemRecord,
	ShoppingStoreRecord,
} from "#/local-db/database";
import type { ShoppingBranch } from "../domain/shopping-branch";
import type { ShoppingItem } from "../domain/shopping-item";
import type { ShoppingStore } from "../domain/shopping-store";

// 買い物メモの表の行と、画面で使う形（持ち主の印なし）の行き来。

export function toShoppingItem({
	ownerScope: _ownerScope,
	...item
}: ShoppingItemRecord): ShoppingItem {
	return item;
}

export function toShoppingStore({
	ownerScope: _ownerScope,
	...store
}: ShoppingStoreRecord): ShoppingStore {
	return store;
}

export function toShoppingBranch({
	ownerScope: _ownerScope,
	...branch
}: ShoppingBranchRecord): ShoppingBranch {
	return branch;
}

export function withOwner<T>(
	row: T,
	ownerScope: InventoryPurchaseOwnerScope,
): T & { ownerScope: InventoryPurchaseOwnerScope } {
	return { ...row, ownerScope };
}

// [ownerScope+sortOrder] の索引で、その持ち主の行を、並び順に取る。
export function ownerSortRange(ownerScope: InventoryPurchaseOwnerScope) {
	return [
		[ownerScope, Dexie.minKey],
		[ownerScope, Dexie.maxKey],
	] as const;
}
