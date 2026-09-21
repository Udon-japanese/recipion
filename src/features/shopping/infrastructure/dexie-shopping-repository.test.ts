import { beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import { createShoppingItem } from "../domain/shopping-item";
import { dexieShoppingRepository } from "./dexie-shopping-repository";

describe("dexieShoppingRepository", () => {
	beforeEach(async () => {
		await getLocalDatabase().shoppingItems.clear();
	});

	it("買い物項目を保存して取得できる", async () => {
		const item = createShoppingItem(
			{
				name: "卵",
				quantity: 6,
				unitLabel: "個",
			},
			new Date("2026-09-21T10:00:00.000Z"),
		);

		await dexieShoppingRepository.save(item);

		await expect(dexieShoppingRepository.findById(item.id)).resolves.toEqual(
			item,
		);
	});

	it("同じIDの項目を更新できる", async () => {
		const item = createShoppingItem(
			{ name: "牛乳" },
			new Date("2026-09-21T10:00:00.000Z"),
		);

		await dexieShoppingRepository.save(item);
		await dexieShoppingRepository.save({
			...item,
			quantity: 2,
			updatedAt: "2026-09-21T11:00:00.000Z",
		});

		await expect(
			dexieShoppingRepository.findById(item.id),
		).resolves.toMatchObject({
			id: item.id,
			quantity: 2,
			updatedAt: "2026-09-21T11:00:00.000Z",
		});
	});

	it("作成日時の古い順に一覧を取得する", async () => {
		const newerItem = createShoppingItem(
			{ name: "牛乳" },
			new Date("2026-09-21T11:00:00.000Z"),
		);
		const olderItem = createShoppingItem(
			{ name: "卵" },
			new Date("2026-09-21T10:00:00.000Z"),
		);

		await dexieShoppingRepository.save(newerItem);
		await dexieShoppingRepository.save(olderItem);

		const items = await dexieShoppingRepository.list();

		expect(items.map((item) => item.id)).toEqual([olderItem.id, newerItem.id]);
	});

	it("買い物項目を削除できる", async () => {
		const item = createShoppingItem({ name: "食パン" });

		await dexieShoppingRepository.save(item);
		await dexieShoppingRepository.remove(item.id);

		await expect(
			dexieShoppingRepository.findById(item.id),
		).resolves.toBeUndefined();
	});
});
