import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { ShoppingMemories } from "../domain/shopping-item-memory";
import { createDexieShoppingConversionDefaultRepository } from "./dexie-shopping-conversion-default-repository";
import { createDexieShoppingItemMemoryRepository } from "./dexie-shopping-item-memory-repository";

// その持ち主の、買い物メモの記憶（いつもの買い方と、食材×単位の換算）を読む。
export async function readShoppingMemories(
	ownerScope: InventoryPurchaseOwnerScope,
): Promise<ShoppingMemories> {
	const [itemMemories, conversionDefaults] = await Promise.all([
		createDexieShoppingItemMemoryRepository(ownerScope).list(),
		createDexieShoppingConversionDefaultRepository(ownerScope).list(),
	]);

	return { itemMemories, conversionDefaults };
}
