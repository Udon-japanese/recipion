import type { InventoryPurchaseOwnerScope } from "#/features/inventory/infrastructure/inventory-purchase-outbox";
import { getLocalDatabase, type LocalDatabase } from "#/local-db/database";
import { prepareShoppingItemPurchase } from "../application/prepare-shopping-item-purchase";
import type { ShoppingItem } from "../domain/shopping-item";

export type ConfirmCheckedShoppingItemsPurchaseResult =
	| {
			status: "nothing-to-confirm";
	  }
	| {
			status: "missing-conversion";
			items: ShoppingItem[];
	  }
	| {
			status: "confirmed";
			items: ShoppingItem[];
	  };

export async function confirmCheckedShoppingItemsPurchase(
	ownerScope: InventoryPurchaseOwnerScope,
	database: LocalDatabase = getLocalDatabase(),
	now = new Date(),
): Promise<ConfirmCheckedShoppingItemsPurchaseResult> {
	return database.transaction(
		"rw",
		database.shoppingItems,
		database.inventoryPurchaseOutbox,
		async () => {
			const checkedItems = await database.shoppingItems
				.where("status")
				.equals("checked")
				.sortBy("sortOrder");

			if (checkedItems.length === 0) {
				return {
					status: "nothing-to-confirm",
				};
			}

			const itemsMissingConversion = checkedItems.filter(
				(item) => item.inventoryConversion === null,
			);

			if (itemsMissingConversion.length > 0) {
				return {
					status: "missing-conversion",
					items: itemsMissingConversion,
				};
			}

			const preparedPurchases = checkedItems.map((item) =>
				prepareShoppingItemPurchase(item, ownerScope, now),
			);

			const purchasedItems = preparedPurchases.map(
				(purchase) => purchase.purchasedItem,
			);

			const outboxEntries = preparedPurchases.map(
				(purchase) => purchase.outboxEntry,
			);

			await database.inventoryPurchaseOutbox.bulkAdd(outboxEntries);
			await database.shoppingItems.bulkPut(purchasedItems);

			return {
				status: "confirmed",
				items: purchasedItems,
			};
		},
	);
}
