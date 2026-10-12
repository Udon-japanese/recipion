import { liveQuery } from "dexie";
import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingStoreRepository } from "../application/shopping-store-repository";

export const dexieShoppingStoreRepository = {
	async list() {
		return getLocalDatabase().shoppingStores.orderBy("sortOrder").toArray();
	},

	watch(onChange, onError) {
		const subscription = liveQuery(() =>
			getLocalDatabase().shoppingStores.orderBy("sortOrder").toArray(),
		).subscribe({ next: onChange, error: onError });

		return () => subscription.unsubscribe();
	},

	async save(store) {
		await getLocalDatabase().shoppingStores.put(store);
	},

	async remove(id) {
		const database = getLocalDatabase();

		await database.transaction(
			"rw",
			database.shoppingStores,
			database.shoppingItems,
			database.shoppingStoreDefaults,
			async () => {
				await database.shoppingItems
					.where("storeId")
					.equals(id)
					.modify({ storeId: null });
				await database.shoppingStoreDefaults
					.where("storeId")
					.equals(id)
					.delete();
				await database.shoppingStores.delete(id);
			},
		);
	},

	async listDefaults() {
		const defaults = await getLocalDatabase().shoppingStoreDefaults.toArray();

		return Object.fromEntries(
			defaults.map((entry) => [entry.nameKey, entry.storeId]),
		);
	},

	async setDefault(nameKey, storeId) {
		const table = getLocalDatabase().shoppingStoreDefaults;

		if (storeId === null) {
			await table.delete(nameKey);

			return;
		}

		await table.put({ nameKey, storeId });
	},
} satisfies ShoppingStoreRepository;
