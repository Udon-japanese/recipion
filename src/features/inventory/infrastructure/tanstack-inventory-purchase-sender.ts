import { userIdOfOwnerScope } from "../application/inventory-purchase-outbox";
import type { InventoryPurchaseSender } from "../application/sync-inventory-purchase-outbox";
import { recordInventoryPurchaseServerFn } from "../server/record-inventory-purchase";

export const tanstackInventoryPurchaseSender: InventoryPurchaseSender = {
	async send(payload, ownerScope) {
		await recordInventoryPurchaseServerFn({
			data: { ...payload, expectedUserId: userIdOfOwnerScope(ownerScope) },
		});
	},
};
