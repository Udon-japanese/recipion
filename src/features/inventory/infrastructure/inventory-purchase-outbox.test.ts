import { describe, expect, it } from "vitest";

import { createInventoryPurchaseOutboxEntry } from "./inventory-purchase-outbox";

describe("createInventoryPurchaseOutboxEntry", () => {
	it("購入処理を未送信データとして作成する", () => {
		const now = new Date("2026-09-22T12:00:00.000Z");

		const payload = {
			transactionId: "71af9bc7-03ed-4df4-a783-a45e743a81f7",
			shoppingItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
			ingredientName: "卵",
			stockUnitCode: "count" as const,
			stockUnitLabel: "個",
			trackingMode: "exact" as const,
			inputQuantity: 1,
			inputUnitCode: "pack",
			stockQuantityPerInputUnit: 10,
		};

		expect(createInventoryPurchaseOutboxEntry(payload, "guest", now)).toEqual({
			id: payload.transactionId,
			ownerScope: "guest",
			status: "pending",
			payload,
			attemptCount: 0,
			lastAttemptAt: null,
			lastError: null,
			createdAt: "2026-09-22T12:00:00.000Z",
			updatedAt: "2026-09-22T12:00:00.000Z",
		});
	});
});
