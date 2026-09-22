import type { InventoryPurchaseSender } from "../application/sync-inventory-purchase-outbox";
import { recordInventoryPurchaseServerFn } from "../server/record-inventory-purchase";

export const tanstackInventoryPurchaseSender: InventoryPurchaseSender = {
	async send(payload) {
		await recordInventoryPurchaseServerFn({
			data: payload,
		});
	},
};
