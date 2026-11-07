import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { createDexieShoppingBranchRepository } from "./dexie-shopping-branch-repository";
import { createDexieShoppingConversionDefaultRepository } from "./dexie-shopping-conversion-default-repository";
import { createDexieShoppingRepository } from "./dexie-shopping-repository";
import { createDexieShoppingStoreRepository } from "./dexie-shopping-store-repository";

// その持ち主の買い物メモの、すべての保存先。
export function createDexieShoppingRepositories(
	ownerScope: InventoryPurchaseOwnerScope,
) {
	return {
		items: createDexieShoppingRepository(ownerScope),
		stores: createDexieShoppingStoreRepository(ownerScope),
		branches: createDexieShoppingBranchRepository(ownerScope),
		conversionDefaults:
			createDexieShoppingConversionDefaultRepository(ownerScope),
	};
}
