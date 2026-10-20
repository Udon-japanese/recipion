import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { LocalDatabase } from "./database";

const names: string[] = [];

afterEach(async () => {
	for (const name of names.splice(0)) {
		await Dexie.delete(name);
	}
});

describe("LocalDatabase のバージョンアップ", () => {
	it("公開済みの形（version 1）のデータが、最新の版へ上がっても残り、記憶のテーブルが使える", async () => {
		const name = `upgrade-test-${crypto.randomUUID()}`;

		names.push(name);

		// 公開したときの形（version 1）で、データを入れておく。
		const legacy = new Dexie(name);

		legacy.version(1).stores({
			shoppingItems:
				"id, status, categoryId, categoryAssignment, storeId, branchId, sortOrder, createdAt, updatedAt",
			inventoryPurchaseOutbox: "id, ownerScope, status, createdAt, updatedAt",
			inventorySnapshots: "ownerScope, cachedAt",
			shoppingStores: "id, sortOrder",
			shoppingStoreDefaults: "nameKey, storeId",
			shoppingBranches: "id, sortOrder",
		});
		await legacy.table("shoppingItems").put({ id: "item-1", name: "卵" });
		await legacy.table("shoppingStoreDefaults").put({
			nameKey: "卵",
			storeId: "store-1",
		});
		legacy.close();

		// いまの形で開く。
		const database = new LocalDatabase(name);

		expect(await database.shoppingItems.get("item-1")).toMatchObject({
			name: "卵",
		});
		expect(await database.shoppingStoreDefaults.get("卵")).toMatchObject({
			storeId: "store-1",
		});

		await database.shoppingConversionMemories.put({
			key: "牛乳\t本",
			nameKey: "牛乳",
			unitLabel: "本",
			inventoryConversion: {
				inputUnitCode: "本",
				stockUnitCode: "ml",
				stockUnitLabel: "ml",
				stockQuantityPerInputUnit: 1000,
				trackingMode: "estimated",
			},
			usedAt: 1,
		});

		expect(await database.shoppingConversionMemories.count()).toBe(1);
		database.close();
	});

	it("version 2 の記憶（食材ごとに1つ）は、捨てて、食材×単位の記憶のテーブルに変わる", async () => {
		const name = `upgrade-test-${crypto.randomUUID()}`;

		names.push(name);

		const legacy = new Dexie(name);

		legacy.version(2).stores({
			shoppingItems:
				"id, status, categoryId, categoryAssignment, storeId, branchId, sortOrder, createdAt, updatedAt",
			inventoryPurchaseOutbox: "id, ownerScope, status, createdAt, updatedAt",
			inventorySnapshots: "ownerScope, cachedAt",
			shoppingStores: "id, sortOrder",
			shoppingStoreDefaults: "nameKey, storeId",
			shoppingBranches: "id, sortOrder",
			shoppingConversionDefaults: "nameKey",
		});
		await legacy.table("shoppingItems").put({ id: "item-1", name: "卵" });
		await legacy.table("shoppingConversionDefaults").put({ nameKey: "牛乳" });
		legacy.close();

		const database = new LocalDatabase(name);

		expect(await database.shoppingItems.get("item-1")).toMatchObject({
			name: "卵",
		});
		expect(await database.shoppingConversionMemories.count()).toBe(0);
		expect(database.tables.map((table) => table.name)).not.toContain(
			"shoppingConversionDefaults",
		);
		database.close();
	});
});
