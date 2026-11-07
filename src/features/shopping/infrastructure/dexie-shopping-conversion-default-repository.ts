import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingConversionDefaultRepository } from "../application/shopping-conversion-default-repository";
import { toConversionMemoryKey } from "../domain/shopping-conversion-default";

// その持ち主の、食材×単位ごとの在庫換算の記憶。
export function createDexieShoppingConversionDefaultRepository(
	ownerScope: InventoryPurchaseOwnerScope,
): ShoppingConversionDefaultRepository {
	return {
		async list() {
			const records = await getLocalDatabase()
				.scopedShoppingConversionMemories.where("ownerScope")
				.equals(ownerScope)
				.toArray();

			return Object.fromEntries(
				records.map(({ key, ownerScope: _ownerScope, ...entry }) => [
					key,
					entry,
				]),
			);
		},

		async set(entry) {
			await getLocalDatabase().scopedShoppingConversionMemories.put({
				ownerScope,
				key: toConversionMemoryKey(entry.nameKey, entry.unitLabel),
				...entry,
			});
		},
	};
}
