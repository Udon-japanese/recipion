import { describe, expect, it, vi } from "vitest";
import { adjustInventoryWithCache } from "./adjust-inventory-with-cache";
import type { InventoryCacheRepository } from "./inventory-cache-repository";

const command = {
	transactionId: "71af9bc7-03ed-4df4-a783-a45e743a81f7",
	inventoryItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
	inputQuantity: 2,
	inputUnitCode: "count",
	stockQuantityPerInputUnit: 1,
	operation: "increase" as const,
	reason: "manual-adjustment" as const,
};

function createCacheRepository(): InventoryCacheRepository {
	return {
		find: vi.fn(),
		save: vi.fn(),
		updateQuantity: vi.fn().mockResolvedValue(undefined),
	};
}

describe("adjustInventoryWithCache", () => {
	it("在庫調整に成功したらキャッシュ数量も更新する", async () => {
		const cacheRepository = createCacheRepository();
		const now = new Date("2026-09-23T15:00:00.000Z");

		const adjustRemoteInventory = vi.fn().mockResolvedValue({
			status: "applied",
			transactionId: command.transactionId,
			quantity: 8,
		});

		const result = await adjustInventoryWithCache(
			"user:user-id",
			command,
			adjustRemoteInventory,
			cacheRepository,
			now,
		);

		expect(cacheRepository.updateQuantity).toHaveBeenCalledWith(
			"user:user-id",
			command.inventoryItemId,
			8,
			now,
		);

		expect(result.quantity).toBe(8);
	});

	it("サーバー調整に失敗した場合はキャッシュを変更しない", async () => {
		const cacheRepository = createCacheRepository();

		await expect(
			adjustInventoryWithCache(
				"user:user-id",
				command,
				vi.fn().mockRejectedValue(new Error("failed")),
				cacheRepository,
			),
		).rejects.toThrow("failed");

		expect(cacheRepository.updateQuantity).not.toHaveBeenCalled();
	});

	it("キャッシュ更新だけ失敗しても調整結果を返す", async () => {
		const cacheRepository = createCacheRepository();

		vi.mocked(cacheRepository.updateQuantity).mockRejectedValue(
			new Error("cache failed"),
		);

		const result = await adjustInventoryWithCache(
			"user:user-id",
			command,
			vi.fn().mockResolvedValue({
				status: "applied",
				transactionId: command.transactionId,
				quantity: 8,
			}),
			cacheRepository,
		);

		expect(result.quantity).toBe(8);
	});
});
