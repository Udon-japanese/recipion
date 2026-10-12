import { describe, expect, it, vi } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import { createFakeInventoryCacheRepository } from "#/test/fakes/fake-inventory-cache-repository";
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

function createCacheRepository() {
	return createFakeInventoryCacheRepository([
		{
			ownerScope: "user:user-id",
			items: [buildInventoryListItem({ inventoryItemId: "item-1" })],
			cachedAt: "2026-10-04T00:00:00.000Z",
		},
	]);
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
		const cached = await cacheRepository.find("user:user-id");

		expect(cached?.items[0]).toMatchObject({
			quantity: 3,
			lots: [],
			defaultExpiryKind: "use-by",
			defaultStorage: "fridge",
			updatedAt: now.toISOString(),
		});
	});

	it("サーバーの更新に失敗したら、キャッシュを変えない", async () => {
		const cacheRepository = createCacheRepository();
		const before = await cacheRepository.find("user:user-id");

		await expect(
			updateInventoryLotWithCache(
				"user:user-id",
				command,
				vi.fn().mockRejectedValue(new Error("failed")),
				cacheRepository,
			),
		).rejects.toThrow("failed");
		await expect(cacheRepository.find("user:user-id")).resolves.toEqual(before);
	});

	it("キャッシュの更新だけ失敗しても、結果を返す", async () => {
		const cacheRepository = createCacheRepository();

		cacheRepository.failNext("updateStock", new Error("cache"));

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
