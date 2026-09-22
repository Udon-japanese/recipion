import { describe, expect, it, vi } from "vitest";
import { adoptGuestInventoryPurchases } from "./adopt-guest-inventory-purchases";
import type { InventoryPurchaseOutboxRepository } from "./inventory-purchase-outbox-repository";

function createOutboxRepository(
	adoptedCount: number,
): InventoryPurchaseOutboxRepository {
	return {
		enqueue: vi.fn(),
		list: vi.fn().mockResolvedValue([]),
		markFailed: vi.fn(),
		reassignOwnerScope: vi.fn().mockResolvedValue(adoptedCount),
		remove: vi.fn(),
	};
}

describe("adoptGuestInventoryPurchases", () => {
	it("ゲスト購入をユーザーへ引き継いで同期する", async () => {
		const outboxRepository = createOutboxRepository(2);

		const syncPurchases = vi.fn().mockResolvedValue({
			syncedCount: 2,
			failedEntryId: null,
		});

		const result = await adoptGuestInventoryPurchases("user:user-id", {
			outboxRepository,
			syncPurchases,
		});

		expect(outboxRepository.reassignOwnerScope).toHaveBeenCalledWith(
			"guest",
			"user:user-id",
		);

		expect(syncPurchases).toHaveBeenCalledWith("user:user-id");

		expect(result).toEqual({
			adoptedCount: 2,
			syncResult: {
				syncedCount: 2,
				failedEntryId: null,
			},
		});
	});

	it("引き継ぐ購入がなければ同期しない", async () => {
		const outboxRepository = createOutboxRepository(0);
		const syncPurchases = vi.fn();

		const result = await adoptGuestInventoryPurchases("user:user-id", {
			outboxRepository,
			syncPurchases,
		});

		expect(syncPurchases).not.toHaveBeenCalled();

		expect(result).toEqual({
			adoptedCount: 0,
			syncResult: null,
		});
	});

	it("ゲスト状態では引き継げない", async () => {
		const outboxRepository = createOutboxRepository(1);
		const syncPurchases = vi.fn();

		await expect(
			adoptGuestInventoryPurchases("guest", {
				outboxRepository,
				syncPurchases,
			}),
		).rejects.toThrow("ゲスト購入の引き継ぎにはログインが必要です");

		expect(outboxRepository.reassignOwnerScope).not.toHaveBeenCalled();

		expect(syncPurchases).not.toHaveBeenCalled();
	});
});
