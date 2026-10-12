import { describe, expect, it, vi } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import { createFakeInventoryCacheRepository } from "#/test/fakes/fake-inventory-cache-repository";
import { adjustInventoryWithCache } from "./adjust-inventory-with-cache";

const lots = [
	{
		id: "lot-1",
		quantity: 8,
		acquiredOn: "2026-09-23",
		storage: null,
		expiresOn: null,
		expiryKind: null,
		expirySource: null,
		createdAt: "2026-09-23T00:00:00.000Z",
	},
];

const command = {
	transactionId: "71af9bc7-03ed-4df4-a783-a45e743a81f7",
	inventoryItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
	inputQuantity: 2,
	inputUnitCode: "count",
	stockQuantityPerInputUnit: 1,
	operation: "increase" as const,
	reason: "manual-adjustment" as const,
};

function createCacheRepository() {
	return createFakeInventoryCacheRepository([
		{
			ownerScope: "user:user-id",
			items: [
				buildInventoryListItem({
					inventoryItemId: command.inventoryItemId,
					quantity: 6,
				}),
			],
			cachedAt: "2026-09-23T00:00:00.000Z",
		},
	]);
}

describe("adjustInventoryWithCache", () => {
	it("在庫調整に成功したらキャッシュ数量も更新する", async () => {
		const cacheRepository = createCacheRepository();
		const now = new Date("2026-09-23T15:00:00.000Z");

		const adjustRemoteInventory = vi.fn().mockResolvedValue({
			status: "applied",
			transactionId: command.transactionId,
			quantity: 8,
			lots,
		});

		const result = await adjustInventoryWithCache(
			"user:user-id",
			command,
			adjustRemoteInventory,
			cacheRepository,
			now,
		);

		const cached = await cacheRepository.find("user:user-id");

		expect(cached?.items[0]).toMatchObject({ quantity: 8, lots });
		expect(cached?.cachedAt).toBe(now.toISOString());

		expect(result.quantity).toBe(8);
	});

	it("サーバー調整に失敗した場合はキャッシュを変更しない", async () => {
		const cacheRepository = createCacheRepository();
		const before = await cacheRepository.find("user:user-id");

		await expect(
			adjustInventoryWithCache(
				"user:user-id",
				command,
				vi.fn().mockRejectedValue(new Error("failed")),
				cacheRepository,
			),
		).rejects.toThrow("failed");

		await expect(cacheRepository.find("user:user-id")).resolves.toEqual(before);
	});

	it("キャッシュ更新だけ失敗しても調整結果を返す", async () => {
		const cacheRepository = createCacheRepository();

		cacheRepository.failNext("updateStock", new Error("cache failed"));

		const result = await adjustInventoryWithCache(
			"user:user-id",
			command,
			vi.fn().mockResolvedValue({
				status: "applied",
				transactionId: command.transactionId,
				quantity: 8,
				lots,
			}),
			cacheRepository,
		);

		expect(result.quantity).toBe(8);
	});
});
