import { afterEach, describe, expect, it } from "vitest";
import { LocalDatabase } from "#/local-db/database";
import type { InventoryListItem } from "../application/inventory-query-repository";
import { createDexieInventoryCacheRepository } from "./dexie-inventory-cache-repository";

const databases: LocalDatabase[] = [];

function createTestContext() {
	const database = new LocalDatabase(
		`inventory-cache-test-${crypto.randomUUID()}`,
	);
	const repository = createDexieInventoryCacheRepository(database);

	databases.push(database);

	return {
		database,
		repository,
	};
}

const egg: InventoryListItem = {
	inventoryItemId: "inventory-id",
	ingredientId: "ingredient-id",
	name: "卵",
	displayName: null,
	quantity: 6,
	lots: [],
	stockUnitCode: "count",
	stockUnitLabel: "個",
	trackingMode: "exact",
	defaultExpiryKind: null,
	defaultStorage: null,
	updatedAt: "2026-09-23T00:00:00.000Z",
};

afterEach(async () => {
	await Promise.all(
		databases.splice(0).map(async (database) => {
			database.close();
			await database.delete();
		}),
	);
});

describe("dexieInventoryCacheRepository", () => {
	it("ユーザーの在庫一覧を保存して取得する", async () => {
		const { repository } = createTestContext();
		const cachedAt = new Date("2026-09-23T12:00:00.000Z");

		await repository.save("user:user-id", [egg], cachedAt);

		expect(await repository.find("user:user-id")).toEqual({
			ownerScope: "user:user-id",
			items: [egg],
			cachedAt: "2026-09-23T12:00:00.000Z",
		});
	});

	it("同じユーザーの古い在庫一覧を置き換える", async () => {
		const { repository } = createTestContext();

		await repository.save("user:user-id", [egg]);

		await repository.save("user:user-id", [
			{
				...egg,
				quantity: 10,
			},
		]);

		expect(await repository.find("user:user-id")).toEqual(
			expect.objectContaining({
				items: [
					expect.objectContaining({
						quantity: 10,
					}),
				],
			}),
		);
	});

	it("別ユーザーの在庫を混ぜない", async () => {
		const { repository } = createTestContext();

		await repository.save("user:first-user", [egg]);

		expect(await repository.find("user:second-user")).toBeUndefined();
	});

	it("空の在庫一覧も保存できる", async () => {
		const { repository } = createTestContext();

		await repository.save("user:user-id", []);

		expect(await repository.find("user:user-id")).toEqual(
			expect.objectContaining({
				items: [],
			}),
		);
	});

	it("保存済み在庫の数量とロットを更新する", async () => {
		const { repository } = createTestContext();
		const now = new Date("2026-09-23T15:00:00.000Z");
		const lot = {
			id: "lot-1",
			quantity: 10,
			acquiredOn: "2026-09-23",
			storage: null,
			expiresOn: null,
			expiryKind: null,
			expirySource: null,
			createdAt: "2026-09-23T00:00:00.000Z",
		} as const;

		await repository.save("user:user-id", [egg]);

		await repository.updateStock(
			"user:user-id",
			egg.inventoryItemId,
			{ quantity: 10, lots: [lot] },
			now,
		);

		expect(await repository.find("user:user-id")).toEqual(
			expect.objectContaining({
				cachedAt: "2026-09-23T15:00:00.000Z",
				items: [
					expect.objectContaining({
						inventoryItemId: egg.inventoryItemId,
						quantity: 10,
						lots: [lot],
						updatedAt: "2026-09-23T15:00:00.000Z",
					}),
				],
			}),
		);
	});
});
