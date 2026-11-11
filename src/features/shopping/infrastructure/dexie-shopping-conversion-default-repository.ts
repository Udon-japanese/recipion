import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingConversionDefaultRepository } from "../application/shopping-conversion-default-repository";

// その持ち主の、在庫換算の記憶（食材×単位×換算ごと）。
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

		async set(key, entry) {
			await getLocalDatabase().scopedShoppingConversionMemories.put({
				ownerScope,
				key,
				...entry,
			});
		},

		async remove(keys) {
			await getLocalDatabase().scopedShoppingConversionMemories.bulkDelete(
				keys.map((key): [string, string] => [ownerScope, key]),
			);
		},
	};
}
