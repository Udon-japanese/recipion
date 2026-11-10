import { beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "#/local-db/database";
import { createShoppingItem } from "../domain/shopping-item";
import { createShoppingStore } from "../domain/shopping-store";
import {
	adoptGuestShoppingMemo,
	type GuestShoppingMemoState,
	watchGuestShoppingMemo,
} from "./dexie-guest-shopping-adoption";
import { createDexieShoppingRepositories } from "./dexie-shopping-repositories";
import { readOwnedShoppingData } from "./read-owned-shopping-data";

const guest = createDexieShoppingRepositories("guest");
const account = createDexieShoppingRepositories("user:a");

beforeEach(async () => {
	const database = getLocalDatabase();

	await Promise.all(
		[
			database.shoppingItems,
			database.shoppingStores,
			database.shoppingBranches,
			database.scopedShoppingStoreDefaults,
			database.scopedShoppingConversionMemories,
			database.inventoryPurchaseOutbox,
		].map((table) => table.clear()),
	);
});

describe("adoptGuestShoppingMemo", () => {
	it("ゲストのメモをアカウントに移し、同じ名前の店はまとめ、ゲストのメモは空になる", async () => {
		const guestStore = createShoppingStore("駅前", 0);
		const accountStore = createShoppingStore("駅前", 0);

		await guest.stores.save(guestStore);
		await guest.stores.setDefault("卵", guestStore.id);
		await guest.items.save(
			createShoppingItem({ name: "卵", storeId: guestStore.id }),
		);
		await account.stores.save(accountStore);

		const adoption = await adoptGuestShoppingMemo("user:a");

		expect(adoption.mergedStoreCount).toBe(1);
		await expect(readOwnedShoppingData("guest")).resolves.toEqual({
			items: [],
			stores: [],
			branches: [],
			storeDefaults: [],
			conversionMemories: [],
			itemMemories: [],
		});
		await expect(account.items.list()).resolves.toMatchObject([
			{ name: "卵", storeId: accountStore.id },
		]);
		await expect(account.stores.list()).resolves.toEqual([accountStore]);
		await expect(account.stores.listDefaults()).resolves.toEqual({
			卵: accountStore.id,
		});
	});
});

describe("watchGuestShoppingMemo", () => {
	it("ゲストのメモと、ゲストの購入の送信待ちの有無を知らせる", async () => {
		await guest.items.save(createShoppingItem({ name: "卵" }));

		const state = await new Promise<GuestShoppingMemoState>(
			(resolve, reject) => {
				const unsubscribe = watchGuestShoppingMemo((next) => {
					unsubscribe();
					resolve(next);
				}, reject);
			},
		);

		expect(state).toEqual({
			hasMemo: true,
			pendingItemCount: 1,
			hasPendingGuestPurchases: false,
		});
	});
});
