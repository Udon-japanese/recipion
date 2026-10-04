import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { InventoryLotInput } from "#/features/inventory/domain/inventory-lot";
import { getLocalDatabase, type LocalDatabase } from "#/local-db/database";
import { prepareShoppingItemPurchase } from "../application/prepare-shopping-item-purchase";
import {
	isInventoryTrackedShoppingItem,
	markShoppingItemAsPurchased,
	type ShoppingItem,
} from "../domain/shopping-item";

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

export type ConfirmShoppingPurchasesOptions = {
	// 購入確定のときに入力した、期限・保存方法（買い物項目の ID ごと）。
	lotsByItemId?: Record<string, InventoryLotInput>;
};

export async function confirmCheckedShoppingItemsPurchase(
	ownerScope: InventoryPurchaseOwnerScope,
	database: LocalDatabase = getLocalDatabase(),
	now = new Date(),
	options: ConfirmShoppingPurchasesOptions = {},
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

			// 日用品は、在庫に入れない（換算も求めず、購入済みにするだけ）。
			const trackedItems = checkedItems.filter(isInventoryTrackedShoppingItem);
			const untrackedItems = checkedItems.filter(
				(item) => !isInventoryTrackedShoppingItem(item),
			);

			const itemsMissingConversion = trackedItems.filter(
				(item) => item.inventoryConversion === null,
			);

			if (itemsMissingConversion.length > 0) {
				return {
					status: "missing-conversion",
					items: itemsMissingConversion,
				};
			}

			const preparedPurchases = trackedItems.map((item) =>
				prepareShoppingItemPurchase(
					item,
					ownerScope,
					now,
					crypto.randomUUID(),
					options.lotsByItemId?.[item.id],
				),
			);

			const purchasedItems = [
				...preparedPurchases.map((purchase) => purchase.purchasedItem),
				...untrackedItems.map((item) => markShoppingItemAsPurchased(item, now)),
			].sort((a, b) => a.sortOrder - b.sortOrder);

			const outboxEntries = preparedPurchases.map(
				(purchase) => purchase.outboxEntry,
			);

			if (outboxEntries.length > 0) {
				await database.inventoryPurchaseOutbox.bulkAdd(outboxEntries);
			}
			await database.shoppingItems.bulkPut(purchasedItems);

			return {
				status: "confirmed",
				items: purchasedItems,
			};
		},
	);
}
