import {
	createInventoryPurchaseOutboxEntry,
	type InventoryPurchaseOutboxEntry,
	type InventoryPurchaseOwnerScope,
} from "#/features/inventory/infrastructure/inventory-purchase-outbox";
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
		},
		ownerScope,
		now,
	);

	return {
		purchasedItem,
		outboxEntry,
	};
}
