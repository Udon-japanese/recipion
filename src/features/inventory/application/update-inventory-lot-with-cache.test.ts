import { describe, expect, it, vi } from "vitest";
import type { InventoryCacheRepository } from "./inventory-cache-repository";
import type { UpdateInventoryLotCommand } from "./inventory-lot-repository";
import { updateInventoryLotWithCache } from "./update-inventory-lot-with-cache";

const command: UpdateInventoryLotCommand = {
	lotId: "6b1d4f0e-0a0e-4c85-9a3f-111111111111",
	expiresOn: "2026-10-10",
	expiryKind: "use-by",
	storage: "fridge",
	saveAsIngredientDefault: true,
};

const result = {
	inventoryItemId: "item-1",
	quantity: 3,
	lots: [],
	defaultExpiryKind: "use-by" as const,
	defaultStorage: "fridge" as const,
};

function createCacheRepository(): InventoryCacheRepository {
	return {
		find: vi.fn(),
		save: vi.fn(),
		updateStock: vi.fn().mockResolvedValue(undefined),
	};
}

describe("updateInventoryLotWithCache", () => {
	it("更新に成功したら、キャッシュのロットと食材の初期値も更新する", async () => {
		const cacheRepository = createCacheRepository();
		const now = new Date("2026-10-05T00:00:00.000Z");

		const updated = await updateInventoryLotWithCache(
			"user:user-id",
			command,
			vi.fn().mockResolvedValue(result),
			cacheRepository,
			now,
		);

		expect(updated).toBe(result);
		expect(cacheRepository.updateStock).toHaveBeenCalledWith(
			"user:user-id",
			"item-1",
			{
				quantity: 3,
				lots: [],
				defaultExpiryKind: "use-by",
				defaultStorage: "fridge",
			},
			now,
		);
	});

	it("サーバーの更新に失敗したら、キャッシュを変えない", async () => {
		const cacheRepository = createCacheRepository();

		await expect(
			updateInventoryLotWithCache(
				"user:user-id",
				command,
				vi.fn().mockRejectedValue(new Error("failed")),
				cacheRepository,
			),
		).rejects.toThrow("failed");
		expect(cacheRepository.updateStock).not.toHaveBeenCalled();
	});

	it("キャッシュの更新だけ失敗しても、結果を返す", async () => {
		const cacheRepository = createCacheRepository();

		vi.mocked(cacheRepository.updateStock).mockRejectedValue(
			new Error("cache"),
		);

		await expect(
			updateInventoryLotWithCache(
				"user:user-id",
				command,
				vi.fn().mockResolvedValue(result),
				cacheRepository,
			),
		).resolves.toBe(result);
	});
});
