import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { createShoppingItem } from "../features/shopping/domain/shopping-item";
import { LocalDatabase } from "./database";

const databaseNames: string[] = [];

afterEach(async () => {
	await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
});

describe("LocalDatabase", () => {
	it("開いて、買い物項目を、並び順・店・分岐の索引で引ける", async () => {
		const databaseName = `schema-test-${crypto.randomUUID()}`;
		databaseNames.push(databaseName);

		const database = new LocalDatabase(databaseName);
		const first = createShoppingItem(
			{
				name: "卵",
				storeId: "store-1",
				branchId: "branch-1",
				branchSide: "then",
			},
			new Date("2026-10-01T00:00:00.000Z"),
			1,
		);
		const second = createShoppingItem(
			{ name: "牛乳" },
			new Date("2026-10-01T00:01:00.000Z"),
			0,
		);

		await database.shoppingItems.bulkPut([first, second]);

		await expect(
			database.shoppingItems.orderBy("sortOrder").toArray(),
		).resolves.toEqual([second, first]);
		await expect(
			database.shoppingItems.where("storeId").equals("store-1").toArray(),
		).resolves.toEqual([first]);
		await expect(
			database.shoppingItems.where("branchId").equals("branch-1").toArray(),
		).resolves.toEqual([first]);

		database.close();
	});
});
