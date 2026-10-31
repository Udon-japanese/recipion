import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";

const storageKey = "recipion.inventory.lastOwner";

// この端末で、最後に、ログイン前の購入を片づけた（引き継いだ・引き継ぐものがなかった）ユーザー。
// 同じ人が、またログインしたときは、ログイン前の購入を、聞かずに引き継ぐ。別の人や、初めての人には、聞く。
export type LastOwnerMemory = {
	get: () => InventoryPurchaseOwnerScope | null;
	set: (ownerScope: InventoryPurchaseOwnerScope) => void;
};

export const localStorageLastOwnerMemory: LastOwnerMemory = {
	get() {
		try {
			const value = localStorage.getItem(storageKey);

			return value?.startsWith("user:")
				? (value as InventoryPurchaseOwnerScope)
				: null;
		} catch {
			return null;
		}
	},
	set(ownerScope) {
		try {
			localStorage.setItem(storageKey, ownerScope);
		} catch {
			// 保存できないときは、覚えない（次も、聞く）。
		}
	},
};
