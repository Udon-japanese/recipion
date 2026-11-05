import type { RecordInventoryPurchaseInput } from "../application/record-inventory-purchase";

export type InventoryPurchaseOutboxStatus = "pending" | "failed";

export type InventoryPurchaseOwnerScope = "guest" | `user:${string}`;

// ログインした人の所有者の印から、ユーザー ID を取り出す（サーバー関数の expectedUserId に渡す）。
export function userIdOfOwnerScope(ownerScope: `user:${string}`): string {
	return ownerScope.slice("user:".length);
}

export type InventoryPurchaseOutboxEntry = {
	id: string;
	ownerScope: InventoryPurchaseOwnerScope;
	status: InventoryPurchaseOutboxStatus;
	payload: RecordInventoryPurchaseInput;
	attemptCount: number;
	lastAttemptAt: string | null;
	lastError: string | null;
	createdAt: string;
	updatedAt: string;
};

export function createInventoryPurchaseOutboxEntry(
	payload: RecordInventoryPurchaseInput,
	ownerScope: InventoryPurchaseOwnerScope = "guest",
	now = new Date(),
): InventoryPurchaseOutboxEntry {
	const timestamp = now.toISOString();

	return {
		id: payload.transactionId,
		ownerScope,
		status: "pending",
		payload,
		attemptCount: 0,
		lastAttemptAt: null,
		lastError: null,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}
