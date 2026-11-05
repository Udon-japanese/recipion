import { liveQuery } from "dexie";
import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingRepository } from "../application/shopping-repository";
import { categorizeUnassignedShoppingItems } from "../domain/shopping-item-categorization";

export const dexieShoppingRepository = {
	async list() {
		return getLocalDatabase().shoppingItems.orderBy("sortOrder").toArray();
	},

	async findById(id) {
		return getLocalDatabase().shoppingItems.get(id);
	},

	async save(item) {
		await getLocalDatabase().shoppingItems.put(item);
	},

	async saveAll(items) {
		const database = getLocalDatabase();

		await database.transaction("rw", database.shoppingItems, async () => {
			await database.shoppingItems.bulkPut([...items]);
		});
	},

	async categorizeUnassigned(ids, now = new Date()) {
		const database = getLocalDatabase();

		await database.transaction("rw", database.shoppingItems, async () => {
			const storedItems = (
				await database.shoppingItems.bulkGet([...ids])
			).filter((item) => item !== undefined);
			const categorizedItems = categorizeUnassignedShoppingItems(
				storedItems,
				now,
			);
			const changedItems = categorizedItems.filter(
				(item, index) => item !== storedItems[index],
			);

			if (changedItems.length > 0) {
				await database.shoppingItems.bulkPut(changedItems);
			}
		});
	},

	async remove(id) {
		await getLocalDatabase().shoppingItems.delete(id);
	},

	async removeAll(ids) {
		const database = getLocalDatabase();

		await database.transaction("rw", database.shoppingItems, async () => {
			await database.shoppingItems.bulkDelete([...ids]);
		});
	},

	watch(onChange, onError) {
		const subscription = liveQuery(() =>
			getLocalDatabase().shoppingItems.orderBy("sortOrder").toArray(),
		).subscribe({ next: onChange, error: onError });

		return () => subscription.unsubscribe();
	},
} satisfies ShoppingRepository;
