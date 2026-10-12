import { describe, expect, it } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import { createFakeInventoryCacheRepository } from "#/test/fakes/fake-inventory-cache-repository";
import { changeInventoryTrackingModeWithCache } from "./change-inventory-tracking-mode-with-cache";

function createCache() {
	return createFakeInventoryCacheRepository([
		{
			ownerScope: "user:u",
			items: [
				buildInventoryListItem({
					inventoryItemId: "inv-1",
					trackingMode: "estimated",
					quantity: 300,
				}),
			],
			cachedAt: "2026-10-01T00:00:00.000Z",
		},
	]);
}

describe("changeInventoryTrackingModeWithCache", () => {
	it("管理方法を変え、キャッシュの管理方法・数量も更新する", async () => {
		const cache = createCache();

		const result = await changeInventoryTrackingModeWithCache(
			"user:u",
			{ inventoryItemId: "inv-1", trackingMode: "presence" },
			async () => ({
				inventoryItemId: "inv-1",
				trackingMode: "presence",
				quantity: 1,
				lots: [],
			}),
			cache,
		);

		expect(result.trackingMode).toBe("presence");
		expect((await cache.find("user:u"))?.items[0]).toMatchObject({
			trackingMode: "presence",
			quantity: 1,
		});
	});

	it("サーバーの変更に失敗したら、エラーにして、キャッシュを変えない", async () => {
		const cache = createCache();

		await expect(
			changeInventoryTrackingModeWithCache(
				"user:u",
				{ inventoryItemId: "inv-1", trackingMode: "presence" },
				async () => {
					throw new Error("offline");
				},
				cache,
			),
		).rejects.toThrow("offline");
		expect((await cache.find("user:u"))?.items[0]?.trackingMode).toBe(
			"estimated",
		);
	});

	it("キャッシュの更新だけ失敗しても、結果を返す", async () => {
		const cache = createCache();

		cache.failNext("updateStock");

		await expect(
			changeInventoryTrackingModeWithCache(
				"user:u",
				{ inventoryItemId: "inv-1", trackingMode: "presence" },
				async () => ({
					inventoryItemId: "inv-1",
					trackingMode: "presence",
					quantity: 1,
					lots: [],
				}),
				cache,
			),
		).resolves.toMatchObject({ trackingMode: "presence" });
	});
});
