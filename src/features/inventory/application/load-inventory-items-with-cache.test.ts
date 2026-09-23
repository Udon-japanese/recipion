import { describe, expect, it, vi } from "vitest";

import type {
	InventoryCacheRepository,
	InventoryCacheSnapshot,
} from "./inventory-cache-repository";
import type { InventoryListItem } from "./inventory-query-repository";
import { loadInventoryItemsWithCache } from "./load-inventory-items-with-cache";

const egg: InventoryListItem = {
	inventoryItemId: "inventory-id",
	ingredientId: "ingredient-id",
	name: "卵",
	quantity: 6,
	stockUnitCode: "count",
	stockUnitLabel: "個",
	trackingMode: "exact",
	updatedAt: "2026-09-23T00:00:00.000Z",
};

function createCacheRepository(
	snapshot?: InventoryCacheSnapshot,
): InventoryCacheRepository {
	return {
		find: vi.fn().mockResolvedValue(snapshot),
		save: vi.fn().mockImplementation(async (ownerScope, items, now) => ({
			ownerScope,
			items: [...items],
			cachedAt: (now ?? new Date()).toISOString(),
		})),
		updateQuantity: vi.fn().mockResolvedValue(undefined),
	};
}

describe("loadInventoryItemsWithCache", () => {
	it("通信で取得した在庫をキャッシュへ保存する", async () => {
		const cacheRepository = createCacheRepository();
		const now = new Date("2026-09-23T12:00:00.000Z");

		const result = await loadInventoryItemsWithCache(
			"user:user-id",
			vi.fn().mockResolvedValue([egg]),
			cacheRepository,
			now,
		);

		expect(cacheRepository.save).toHaveBeenCalledWith(
			"user:user-id",
			[egg],
			now,
		);

		expect(result).toEqual({
			items: [egg],
			source: "network",
			cachedAt: "2026-09-23T12:00:00.000Z",
		});
	});

	it("通信に失敗したら保存済みの在庫を返す", async () => {
		const snapshot: InventoryCacheSnapshot = {
			ownerScope: "user:user-id",
			items: [egg],
			cachedAt: "2026-09-23T10:00:00.000Z",
		};

		const result = await loadInventoryItemsWithCache(
			"user:user-id",
			vi.fn().mockRejectedValue(new Error("offline")),
			createCacheRepository(snapshot),
		);

		expect(result).toEqual({
			items: [egg],
			source: "cache",
			cachedAt: "2026-09-23T10:00:00.000Z",
		});
	});

	it("通信にもキャッシュにも在庫がなければ失敗する", async () => {
		await expect(
			loadInventoryItemsWithCache(
				"user:user-id",
				vi.fn().mockRejectedValue(new Error("offline")),
				createCacheRepository(),
			),
		).rejects.toThrow("offline");
	});

	it("キャッシュ保存だけ失敗しても取得した在庫を返す", async () => {
		const cacheRepository = createCacheRepository();

		vi.mocked(cacheRepository.save).mockRejectedValue(
			new Error("cache failed"),
		);

		const result = await loadInventoryItemsWithCache(
			"user:user-id",
			vi.fn().mockResolvedValue([egg]),
			cacheRepository,
		);

		expect(result).toEqual({
			items: [egg],
			source: "network",
			cachedAt: null,
		});
	});
});
