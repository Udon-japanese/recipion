import { beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import { createShoppingItem } from "../domain/shopping-item";
import { createShoppingStore } from "../domain/shopping-store";
import { dexieShoppingRepository } from "./dexie-shopping-repository";
import { dexieShoppingStoreRepository } from "./dexie-shopping-store-repository";

describe("dexieShoppingStoreRepository", () => {
	beforeEach(async () => {
		const database = getLocalDatabase();

		await database.shoppingItems.clear();
		await database.shoppingStores.clear();
		await database.shoppingStoreDefaults.clear();
	});

	it("店を保存して、並び順で取得できる", async () => {
		await dexieShoppingStoreRepository.save(createShoppingStore("B", 1));
		await dexieShoppingStoreRepository.save(createShoppingStore("A", 0));

		const stores = await dexieShoppingStoreRepository.list();

		expect(stores.map((store) => store.name)).toEqual(["A", "B"]);
	});

	it("店を消すと、その店の項目は「どこでも」に戻り、記憶も消える（ほかの店は残る）", async () => {
		const storeA = createShoppingStore("A", 0);
		const storeB = createShoppingStore("B", 1);

		await dexieShoppingStoreRepository.save(storeA);
		await dexieShoppingStoreRepository.save(storeB);
		await dexieShoppingRepository.save(
			createShoppingItem({ name: "卵", storeId: storeA.id }),
		);
		await dexieShoppingRepository.save(
			createShoppingItem({ name: "牛乳", storeId: storeB.id }),
		);
		await dexieShoppingStoreRepository.setDefault("卵", storeA.id);
		await dexieShoppingStoreRepository.setDefault("牛乳", storeB.id);

		await dexieShoppingStoreRepository.remove(storeA.id);

		const items = await dexieShoppingRepository.list();

		expect(
			Object.fromEntries(items.map((item) => [item.name, item.storeId])),
		).toEqual({ 卵: null, 牛乳: storeB.id });
		await expect(dexieShoppingStoreRepository.listDefaults()).resolves.toEqual({
			牛乳: storeB.id,
		});
		await expect(dexieShoppingStoreRepository.list()).resolves.toHaveLength(1);
	});

	it("記憶は、null を渡すと消える", async () => {
		await dexieShoppingStoreRepository.setDefault("卵", "store-1");
		await dexieShoppingStoreRepository.setDefault("卵", null);

		await expect(dexieShoppingStoreRepository.listDefaults()).resolves.toEqual(
			{},
		);
	});
});
