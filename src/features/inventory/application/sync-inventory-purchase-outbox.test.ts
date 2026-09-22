import { describe, expect, it, vi } from "vitest";
import { createInventoryPurchaseOutboxEntry } from "../infrastructure/inventory-purchase-outbox";
import type { InventoryPurchaseOutboxRepository } from "./inventory-purchase-outbox-repository";
import {
	type InventoryPurchaseSender,
	syncInventoryPurchaseOutbox,
} from "./sync-inventory-purchase-outbox";

function createEntry(transactionId: string, createdAt: string) {
	return createInventoryPurchaseOutboxEntry(
		{
			transactionId,
			shoppingItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
			ingredientName: "卵",
			stockUnitCode: "count",
			stockUnitLabel: "個",
			trackingMode: "exact",
			inputQuantity: 1,
			inputUnitCode: "pack",
			stockQuantityPerInputUnit: 10,
		},
		"user:user-id",
		new Date(createdAt),
	);
}

describe("syncInventoryPurchaseOutbox", () => {
	it("送信に成功した操作をキューから削除する", async () => {
		const firstEntry = createEntry(
			"71af9bc7-03ed-4df4-a783-a45e743a81f7",
			"2026-09-22T12:00:00.000Z",
		);
		const secondEntry = createEntry(
			"81af9bc7-03ed-4df4-a783-a45e743a81f8",
			"2026-09-22T13:00:00.000Z",
		);

		const outboxRepository: InventoryPurchaseOutboxRepository = {
			enqueue: vi.fn(),
			list: vi.fn().mockResolvedValue([firstEntry, secondEntry]),
			markFailed: vi.fn(),
			remove: vi.fn(),
		};

		const sender: InventoryPurchaseSender = {
			send: vi.fn().mockResolvedValue(undefined),
		};

		await expect(
			syncInventoryPurchaseOutbox("user:user-id", outboxRepository, sender),
		).resolves.toEqual({
			syncedCount: 2,
			failedEntryId: null,
		});

		expect(sender.send).toHaveBeenNthCalledWith(1, firstEntry.payload);
		expect(sender.send).toHaveBeenNthCalledWith(2, secondEntry.payload);
		expect(outboxRepository.remove).toHaveBeenCalledTimes(2);
	});

	it("送信に失敗した操作を記録して後続処理を止める", async () => {
		const firstEntry = createEntry(
			"71af9bc7-03ed-4df4-a783-a45e743a81f7",
			"2026-09-22T12:00:00.000Z",
		);
		const secondEntry = createEntry(
			"81af9bc7-03ed-4df4-a783-a45e743a81f8",
			"2026-09-22T13:00:00.000Z",
		);

		const outboxRepository: InventoryPurchaseOutboxRepository = {
			enqueue: vi.fn(),
			list: vi.fn().mockResolvedValue([firstEntry, secondEntry]),
			markFailed: vi.fn(),
			remove: vi.fn(),
		};

		const sender: InventoryPurchaseSender = {
			send: vi.fn().mockRejectedValue(new Error("オフラインです")),
		};

		await expect(
			syncInventoryPurchaseOutbox("user:user-id", outboxRepository, sender),
		).resolves.toEqual({
			syncedCount: 0,
			failedEntryId: firstEntry.id,
		});

		expect(outboxRepository.markFailed).toHaveBeenCalledWith(
			firstEntry.id,
			"オフラインです",
		);
		expect(sender.send).toHaveBeenCalledTimes(1);
		expect(outboxRepository.remove).not.toHaveBeenCalled();
	});
});
