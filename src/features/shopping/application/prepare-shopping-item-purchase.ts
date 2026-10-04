import {
	createInventoryPurchaseOutboxEntry,
	type InventoryPurchaseOutboxEntry,
	type InventoryPurchaseOwnerScope,
} from "#/features/inventory/application/inventory-purchase-outbox";
import {
	type InventoryLotInput,
	toDateString,
} from "#/features/inventory/domain/inventory-lot";
import {
	markShoppingItemAsPurchased,
	type ShoppingItem,
} from "../domain/shopping-item";

export type PreparedShoppingItemPurchase = {
	purchasedItem: ShoppingItem;
	outboxEntry: InventoryPurchaseOutboxEntry;
};

export function prepareShoppingItemPurchase(
	item: ShoppingItem,
	ownerScope: InventoryPurchaseOwnerScope,
	now = new Date(),
	transactionId: string = crypto.randomUUID(),
	// 購入確定のときに入力した、期限・保存方法（任意）。
	lot: InventoryLotInput = {},
): PreparedShoppingItemPurchase {
	const purchasedItem = markShoppingItemAsPurchased(item, now);
	const conversion = item.inventoryConversion;

	if (!conversion) {
		throw new Error(`${item.name}の在庫換算を設定してください`);
	}

	const outboxEntry = createInventoryPurchaseOutboxEntry(
		{
			transactionId,
			shoppingItemId: item.id,
			ingredientName: item.name,
			inputQuantity: item.quantity,
			inputUnitCode: conversion.inputUnitCode,
			stockUnitCode: conversion.stockUnitCode,
			stockUnitLabel: conversion.stockUnitLabel,
			stockQuantityPerInputUnit: conversion.stockQuantityPerInputUnit,
			trackingMode: conversion.trackingMode,
			// 買った日は、購入確定した日（在庫への反映が、あとになっても、この日で記録する）。
			lot: { acquiredOn: toDateString(now), ...lot },
		},
		ownerScope,
		now,
	);

	return {
		purchasedItem,
		outboxEntry,
	};
}
