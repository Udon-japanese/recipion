import { liveQuery } from "dexie";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingRepository } from "../application/shopping-repository";
import { categorizeUnassignedShoppingItems } from "../domain/shopping-item-categorization";
import {
	ownerSortRange,
	toShoppingItem,
	withOwner,
} from "./owned-shopping-records";

// その持ち主（ゲスト／ログインした人）の買い物メモの項目。ほかの持ち主の行は、読まない・書かない。
export function createDexieShoppingRepository(
	ownerScope: InventoryPurchaseOwnerScope,
) {
	async function listItems() {
		const [lower, upper] = ownerSortRange(ownerScope);
		const records = await getLocalDatabase()
			.shoppingItems.where("[ownerScope+sortOrder]")
			.between(lower, upper, true, true)
			.toArray();

		return records.map(toShoppingItem);
	}

	// ID が、この持ち主の行か（ほかの持ち主の行を、ID で消したり上書きしたりしない）。
	async function ownedIds(ids: readonly string[]) {
		const records = await getLocalDatabase().shoppingItems.bulkGet([...ids]);

		return records.flatMap((record) =>
			record && record.ownerScope === ownerScope ? [record.id] : [],
		);
	}

	return {
		list: listItems,

		async findById(id) {
			const record = await getLocalDatabase().shoppingItems.get(id);

			return record && record.ownerScope === ownerScope
				? toShoppingItem(record)
				: undefined;
		},

		async save(item) {
			await getLocalDatabase().shoppingItems.put(withOwner(item, ownerScope));
		},

		async saveAll(items) {
			const database = getLocalDatabase();

			await database.transaction("rw", database.shoppingItems, async () => {
				await database.shoppingItems.bulkPut(
					items.map((item) => withOwner(item, ownerScope)),
				);
			});
		},

		// カテゴリが未判定の項目を、保存されている今の値から判定し直して保存する。
		// 画面の写しで上書きしないため、読み直しと保存は1つのトランザクションで行う（消えた項目・判定済みの項目は触らない）。
		async categorizeUnassigned(ids, now = new Date()) {
			const database = getLocalDatabase();

			await database.transaction("rw", database.shoppingItems, async () => {
				const storedItems = (await database.shoppingItems.bulkGet([...ids]))
					.filter((record) => record?.ownerScope === ownerScope)
					.flatMap((record) => (record ? [toShoppingItem(record)] : []));
				const categorizedItems = categorizeUnassignedShoppingItems(
					storedItems,
					now,
				);
				const changedItems = categorizedItems.filter(
					(item, index) => item !== storedItems[index],
				);

				if (changedItems.length > 0) {
					await database.shoppingItems.bulkPut(
						changedItems.map((item) => withOwner(item, ownerScope)),
					);
				}
			});
		},

		async remove(id) {
			const database = getLocalDatabase();

			await database.transaction("rw", database.shoppingItems, async () => {
				await database.shoppingItems.bulkDelete(await ownedIds([id]));
			});
		},

		// まとめて消す（途中で失敗したら、どれも消さない）。
		async removeAll(ids) {
			const database = getLocalDatabase();

			await database.transaction("rw", database.shoppingItems, async () => {
				await database.shoppingItems.bulkDelete(await ownedIds(ids));
			});
		},

		watch(onChange, onError) {
			const subscription = liveQuery(listItems).subscribe({
				next: onChange,
				error: onError,
			});

			return () => subscription.unsubscribe();
		},
	} satisfies ShoppingRepository;
}
