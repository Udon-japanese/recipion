import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { LocalDatabase } from "./database";

const databaseNames: string[] = [];

afterEach(async () => {
	await Promise.all(databaseNames.splice(0).map((name) => Dexie.delete(name)));
});

describe("LocalDatabase", () => {
	it("バージョン1の買い物項目へ並び順を付与する", async () => {
		const databaseName = `migration-test-${crypto.randomUUID()}`;
		databaseNames.push(databaseName);

		const legacyDatabase = new Dexie(databaseName);

		legacyDatabase.version(1).stores({
			shoppingItems: "id, status, createdAt, updatedAt",
		});

		await legacyDatabase.open();
		await legacyDatabase.table("shoppingItems").bulkPut([
			{
				id: "newer",
				name: "牛乳",
				quantity: 1,
				unitLabel: "本",
				status: "pending",
				createdAt: "2026-09-21T11:00:00.000Z",
				updatedAt: "2026-09-21T11:00:00.000Z",
			},
			{
				id: "older",
				name: "卵",
				quantity: 6,
				unitLabel: "個",
				status: "pending",
				createdAt: "2026-09-21T10:00:00.000Z",
				updatedAt: "2026-09-21T10:00:00.000Z",
			},
		]);
		legacyDatabase.close();

		const migratedDatabase = new LocalDatabase(databaseName);
		await migratedDatabase.open();

		const items = await migratedDatabase.shoppingItems
			.orderBy("sortOrder")
			.toArray();

		expect(
			items.map((item) => ({
				id: item.id,
				sortOrder: item.sortOrder,
			})),
		).toEqual([
			{ id: "older", sortOrder: 0 },
			{ id: "newer", sortOrder: 1 },
		]);

		migratedDatabase.close();
	});
});
