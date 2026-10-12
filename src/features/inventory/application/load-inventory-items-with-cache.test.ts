import { describe, expect, it, vi } from "vitest";

import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import { createFakeInventoryCacheRepository } from "#/test/fakes/fake-inventory-cache-repository";
import type { InventoryCacheSnapshot } from "./inventory-cache-repository";
import { loadInventoryItemsWithCache } from "./load-inventory-items-with-cache";

const egg = buildInventoryListItem();

describe("loadInventoryItemsWithCache", () => {
	it("通信で取得した在庫をキャッシュへ保存する", async () => {
		const cacheRepository = createFakeInventoryCacheRepository();
		const now = new Date("2026-09-23T12:00:00.000Z");

		const result = await loadInventoryItemsWithCache(
			"user:user-id",
			vi.fn().mockResolvedValue([egg]),
			cacheRepository,
			now,
		);

		await expect(cacheRepository.find("user:user-id")).resolves.toEqual({
			ownerScope: "user:user-id",
			items: [egg],
			cachedAt: "2026-09-23T12:00:00.000Z",
		});

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
			createFakeInventoryCacheRepository([snapshot]),
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
				createFakeInventoryCacheRepository(),
			),
		).rejects.toThrow("offline");
	});

	it("キャッシュ保存だけ失敗しても取得した在庫を返す", async () => {
		const cacheRepository = createFakeInventoryCacheRepository();

		cacheRepository.failNext("save", new Error("cache failed"));

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
