import { storageKeys } from "#/local-storage/keys";
import { defineStorageItem } from "#/local-storage/storage-item";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";

type UserScope = `user:${string}`;

function isUserScope(value: string): value is UserScope {
	return value.startsWith("user:");
}

// この端末で、最後に、ログイン前の購入を片づけた（引き継いだ・引き継ぐものがなかった）ユーザー。
// 同じ人が、またログインしたときは、ログイン前の購入を、聞かずに引き継ぐ。別の人や、初めての人には、聞く。
export type LastOwnerMemory = {
	get: () => InventoryPurchaseOwnerScope | null;
	set: (ownerScope: InventoryPurchaseOwnerScope) => void;
};

export const lastOwnerStorage = defineStorageItem<UserScope | null>({
	key: storageKeys.inventoryLastOwner,
	defaultValue: null,
	parse: (raw) => (isUserScope(raw) ? raw : undefined),
	serialize: (ownerScope) => ownerScope ?? "",
});

export const localStorageLastOwnerMemory: LastOwnerMemory = {
	get: () => lastOwnerStorage.read(),
	// ゲストは、覚えない。保存できないときは、そのタブの間だけ覚える。
	set(ownerScope) {
		if (isUserScope(ownerScope)) {
			lastOwnerStorage.write(ownerScope);
		}
	},
};
