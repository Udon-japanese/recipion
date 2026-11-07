import { beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "#/local-db/database";
import { createShoppingItem } from "../domain/shopping-item";
import { createShoppingStore } from "../domain/shopping-store";
import { createDexieShoppingRepository } from "./dexie-shopping-repository";
import { createDexieShoppingStoreRepository } from "./dexie-shopping-store-repository";
import { withoutShoppingSyncTracking } from "./shopping-sync-tracking";

const user = "user:user-1" as const;

async function outboxKeys() {
	const entries = await getLocalDatabase().shoppingSyncOutbox.toArray();

	return entries.map(
		({ ownerScope, kind, id }) => `${ownerScope}/${kind}/${id}`,
	);
}

describe("買い物メモの送る印", () => {
	beforeEach(async () => {
		const database = getLocalDatabase();

		await database.shoppingItems.clear();
		await database.shoppingStores.clear();
		await database.scopedShoppingStoreDefaults.clear();
		await database.shoppingSyncOutbox.clear();
	});

	it("ログインした人の行を書く・消すと、印が付く（ゲストの行には付けない）", async () => {
		const item = createShoppingItem({ name: "卵" });

		await createDexieShoppingRepository(user).save(item);
		await createDexieShoppingRepository("guest").save(
			createShoppingItem({ name: "牛乳" }),
		);

		expect(await outboxKeys()).toEqual([`${user}/item/${item.id}`]);

		await getLocalDatabase().shoppingSyncOutbox.clear();
		await createDexieShoppingRepository(user).remove(item.id);

		expect(await outboxKeys()).toEqual([`${user}/item/${item.id}`]);
	});

	it("店を消すと、店・付け替えた項目・消えたいつも買う店の、すべてに印が付く", async () => {
		const store = createShoppingStore("A", 0);
		const item = createShoppingItem({ name: "卵", storeId: store.id });
		const stores = createDexieShoppingStoreRepository(user);

		await stores.save(store);
		await createDexieShoppingRepository(user).save(item);
		await stores.setDefault("卵", store.id);
		await getLocalDatabase().shoppingSyncOutbox.clear();

		await stores.remove(store.id);

		expect((await outboxKeys()).sort()).toEqual(
			[
				`${user}/item/${item.id}`,
				`${user}/store/${store.id}`,
				`${user}/storeDefault/卵`,
			].sort(),
		);
	});

	it("表を空にしても、消した行に印が付く", async () => {
		const item = createShoppingItem({ name: "卵" });

		await createDexieShoppingRepository(user).save(item);
		await getLocalDatabase().shoppingSyncOutbox.clear();
		await getLocalDatabase().shoppingItems.clear();

		expect(await outboxKeys()).toEqual([`${user}/item/${item.id}`]);
	});

	it("印を付けないトランザクション（受け取った行を当てる）では、付けない", async () => {
		const database = getLocalDatabase();

		await database.transaction("rw", database.shoppingItems, async (tx) => {
			withoutShoppingSyncTracking(tx);
			await database.shoppingItems.put({
				...createShoppingItem({ name: "卵" }),
				ownerScope: user,
			});
		});

		expect(await outboxKeys()).toEqual([]);
	});

	it("書き込みが失敗したら、印も残らない（同じトランザクション）", async () => {
		const database = getLocalDatabase();

		await expect(
			database.transaction("rw", database.shoppingItems, async () => {
				await database.shoppingItems.put({
					...createShoppingItem({ name: "卵" }),
					ownerScope: user,
				});
				throw new Error("失敗");
			}),
		).rejects.toThrow("失敗");

		expect(await outboxKeys()).toEqual([]);
		await expect(database.shoppingItems.count()).resolves.toBe(0);
	});
});
