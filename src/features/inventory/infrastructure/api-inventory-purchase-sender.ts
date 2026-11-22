import { userIdOfOwnerScope } from "../application/inventory-purchase-outbox";
import type { InventoryPurchaseSender } from "../application/sync-inventory-purchase-outbox";
import * as inventoryApi from "./inventory-api";

export const apiInventoryPurchaseSender: InventoryPurchaseSender = {
	async send(payload, ownerScope) {
		await inventoryApi.recordInventoryPurchase({
			...payload,
			expectedUserId: userIdOfOwnerScope(ownerScope),
		});
	},
};
