import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { InventoryLotInput } from "#/features/inventory/domain/inventory-lot";
import { getLocalDatabase, type LocalDatabase } from "#/local-db/database";
import { prepareShoppingItemPurchase } from "../application/prepare-shopping-item-purchase";
import { inferInventoryConversion } from "../domain/infer-inventory-conversion";
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
				// 条件つきのメモの中の項目は、条件が決まる（通常の項目になる）までは、購入確定の対象にしない。
				.filter((item) => !item.branchId)
				.sortBy("sortOrder");

			if (checkedItems.length === 0) {
				return {
					status: "nothing-to-confirm",
				};
			}

			// 日用品は、在庫に入れない（換算も求めず、購入済みにするだけ）。
			// 換算が未設定の項目（以前に入れたものなど）は、食材と単位から決められれば、決める。
			const trackedItems = checkedItems
				.filter(isInventoryTrackedShoppingItem)
				.map((item) =>
					item.inventoryConversion
						? item
						: {
								...item,
								inventoryConversion: inferInventoryConversion(
									item.name,
									item.unitLabel,
								),
							},
				);
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
