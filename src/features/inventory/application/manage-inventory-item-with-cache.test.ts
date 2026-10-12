import { describe, expect, it } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import { createFakeInventoryCacheRepository } from "#/test/fakes/fake-inventory-cache-repository";
import {
	deleteInventoryItemWithCache,
	renameInventoryItemWithCache,
} from "./manage-inventory-item-with-cache";

function createCache() {
	return createFakeInventoryCacheRepository([
		{
			ownerScope: "user:u",
			items: [
				buildInventoryListItem({ inventoryItemId: "inv-1", name: "鶏もも肉" }),
				buildInventoryListItem({ inventoryItemId: "inv-2", name: "卵" }),
			],
			cachedAt: "2026-10-01T00:00:00.000Z",
		},
	]);
}

describe("deleteInventoryItemWithCache", () => {
	it("削除して、キャッシュからも消す", async () => {
		const cache = createCache();

		await expect(
			deleteInventoryItemWithCache("user:u", "inv-1", async () => true, cache),
		).resolves.toBe(true);
		expect(
			(await cache.find("user:u"))?.items.map((item) => item.inventoryItemId),
		).toEqual(["inv-2"]);
	});

	it("サーバーの削除に失敗したら、エラーにして、キャッシュを変えない", async () => {
		const cache = createCache();

		await expect(
			deleteInventoryItemWithCache(
				"user:u",
				"inv-1",
				async () => {
					throw new Error("offline");
				},
				cache,
			),
		).rejects.toThrow("offline");
		expect((await cache.find("user:u"))?.items).toHaveLength(2);
	});

	it("キャッシュの更新だけ失敗しても、結果を返す", async () => {
		const cache = createCache();

		cache.failNext("removeItem");

		await expect(
			deleteInventoryItemWithCache("user:u", "inv-1", async () => true, cache),
		).resolves.toBe(true);
	});
});

describe("renameInventoryItemWithCache", () => {
	it("呼び名を変え、キャッシュにも反映する。食材の名前は変わらない", async () => {
		const cache = createCache();

		await renameInventoryItemWithCache(
			"user:u",
			{ inventoryItemId: "inv-1", displayName: "イオンで買った鶏もも" },
			async (command) => command,
			cache,
		);

		expect((await cache.find("user:u"))?.items[0]).toMatchObject({
			name: "鶏もも肉",
			displayName: "イオンで買った鶏もも",
		});
	});

	it("サーバーの変更に失敗したら、エラーにして、キャッシュを変えない", async () => {
		const cache = createCache();

		await expect(
			renameInventoryItemWithCache(
				"user:u",
				{ inventoryItemId: "inv-1", displayName: "x" },
				async () => {
					throw new Error("offline");
				},
				cache,
			),
		).rejects.toThrow("offline");
		expect((await cache.find("user:u"))?.items[0]?.displayName).toBeNull();
	});
});
