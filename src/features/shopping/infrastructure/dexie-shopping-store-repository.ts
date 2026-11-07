import { liveQuery } from "dexie";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingStoreRepository } from "../application/shopping-store-repository";
import {
	ownerSortRange,
	toShoppingStore,
	withOwner,
} from "./owned-shopping-records";

// その持ち主の店と、食材ごとのいつも買う店。
export function createDexieShoppingStoreRepository(
	ownerScope: InventoryPurchaseOwnerScope,
) {
	async function listStores() {
		const [lower, upper] = ownerSortRange(ownerScope);
		const records = await getLocalDatabase()
			.shoppingStores.where("[ownerScope+sortOrder]")
			.between(lower, upper, true, true)
			.toArray();

		return records.map(toShoppingStore);
	}

	return {
		list: listStores,

		watch(onChange, onError) {
			const subscription = liveQuery(listStores).subscribe({
				next: onChange,
				error: onError,
			});

			return () => subscription.unsubscribe();
		},

		async save(store) {
			await getLocalDatabase().shoppingStores.put(withOwner(store, ownerScope));
		},

		// 店を消すと、その店の項目は「どこでも」に戻り、その店を、いつも買う店にしていた記憶も消える。
		async remove(id) {
			const database = getLocalDatabase();

			await database.transaction(
				"rw",
				database.shoppingStores,
				database.shoppingItems,
				database.scopedShoppingStoreDefaults,
				async () => {
					const store = await database.shoppingStores.get(id);

					if (store?.ownerScope !== ownerScope) {
						return;
					}

					await database.shoppingItems
						.where("storeId")
						.equals(id)
						.and((item) => item.ownerScope === ownerScope)
						.modify({ storeId: null });
					await database.scopedShoppingStoreDefaults
						.where("storeId")
						.equals(id)
						.and((entry) => entry.ownerScope === ownerScope)
						.delete();
					await database.shoppingStores.delete(id);
				},
			);
		},

		async listDefaults() {
			const defaults = await getLocalDatabase()
				.scopedShoppingStoreDefaults.where("ownerScope")
				.equals(ownerScope)
				.toArray();

			return Object.fromEntries(
				defaults.map((entry) => [entry.nameKey, entry.storeId]),
			);
		},

		async setDefault(nameKey, storeId) {
			const table = getLocalDatabase().scopedShoppingStoreDefaults;

			if (storeId === null) {
				await table.delete([ownerScope, nameKey]);

				return;
			}

			await table.put({ ownerScope, nameKey, storeId });
		},
	} satisfies ShoppingStoreRepository;
}
