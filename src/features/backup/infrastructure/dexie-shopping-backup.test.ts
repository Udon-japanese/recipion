import { beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "#/local-db/database";
import { buildShoppingData } from "#/test/builders/build-shopping-backup";
import { createShoppingBackupFile } from "../domain/shopping-backup-file";
import { readShoppingData, replaceShoppingData } from "./dexie-shopping-backup";

async function clearShoppingTables() {
	const database = getLocalDatabase();

	await Promise.all([
		database.shoppingItems.clear(),
		database.shoppingStores.clear(),
		database.shoppingBranches.clear(),
		database.scopedShoppingStoreDefaults.clear(),
		database.scopedShoppingConversionMemories.clear(),
	]);
}

describe("replaceShoppingData", () => {
	beforeEach(clearShoppingTables);

	it("その持ち主のいまの中身（購入済みも）を消して、ファイルの内容だけにする", async () => {
		const database = getLocalDatabase();

		await database.shoppingItems.put({
			...buildShoppingData().items[2],
			id: "old-item",
			ownerScope: "guest",
		});
		await database.shoppingStores.put({
			...buildShoppingData().stores[0],
			id: "old-store",
			ownerScope: "guest",
		});

		const file = createShoppingBackupFile(buildShoppingData());

		await replaceShoppingData("guest", file);

		const stored = await readShoppingData("guest");

		expect(stored.items.map((item) => item.id).sort()).toEqual([
			"item-egg",
			"item-mince",
		]);
		expect(stored.stores.map((store) => store.id)).toEqual(["store-1"]);
		expect(stored.branches.map((branch) => branch.id)).toEqual(["branch-1"]);
		expect(stored.storeDefaults).toEqual(file.storeDefaults);
		expect(stored.conversionMemories).toEqual(file.conversionMemories);
	});

	it("ほかの持ち主のメモは、消さない", async () => {
		const database = getLocalDatabase();

		await database.shoppingItems.put({
			...buildShoppingData().items[0],
			id: "someone-item",
			storeId: null,
			ownerScope: "user:someone",
		});

		await replaceShoppingData(
			"guest",
			createShoppingBackupFile(buildShoppingData()),
		);

		expect(await readShoppingData("user:someone")).toMatchObject({
			items: [{ id: "someone-item" }],
		});
	});

	it("途中で失敗したら、いまの中身のまま", async () => {
		const original = buildShoppingData();

		await replaceShoppingData("guest", createShoppingBackupFile(original));

		const file = createShoppingBackupFile(original);
		const broken = {
			...file,
			// 同じキーの2行目で bulkAdd が失敗する（ふつうは、読み込みの検証で断られる形）。
			stores: [file.stores[0], file.stores[0]],
			items: [],
		};

		await expect(replaceShoppingData("guest", broken)).rejects.toThrow();

		const stored = await readShoppingData("guest");

		expect(stored.items.map((item) => item.id).sort()).toEqual([
			"item-egg",
			"item-mince",
		]);
	});
});
