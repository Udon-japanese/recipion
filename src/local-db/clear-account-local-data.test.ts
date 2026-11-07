import { afterEach, describe, expect, it } from "vitest";
import {
	createInventoryPurchaseOutboxEntry,
	type InventoryPurchaseOwnerScope,
} from "#/features/inventory/application/inventory-purchase-outbox";
import { createDexieInventoryPurchaseOutboxRepository } from "#/features/inventory/infrastructure/dexie-inventory-purchase-outbox-repository";
import { createShoppingItem } from "#/features/shopping/domain/shopping-item";
import {
	clearAccountLocalData,
	findUnsentAccountChanges,
	noUnsentAccountChanges,
} from "./clear-account-local-data";
import { LocalDatabase } from "./database";

const user = "user:user-1" as const;
const otherUser = "user:user-2" as const;
const cachedAt = "2026-11-07T00:00:00.000Z";

const databases: LocalDatabase[] = [];

afterEach(async () => {
	await Promise.all(databases.splice(0).map((database) => database.delete()));
});

function createDatabase() {
	const database = new LocalDatabase(
		`account-clear-test-${crypto.randomUUID()}`,
	);

	databases.push(database);

	return database;
}

function purchaseEntry(ownerScope: InventoryPurchaseOwnerScope) {
	return createInventoryPurchaseOutboxEntry(
		{
			transactionId: crypto.randomUUID(),
			shoppingItemId: crypto.randomUUID(),
			ingredientName: "卵",
			stockUnitCode: "count",
			stockUnitLabel: "個",
			trackingMode: "exact",
			inputQuantity: 1,
			inputUnitCode: "pack",
			stockQuantityPerInputUnit: 10,
		},
		ownerScope,
	);
}

// 持ち主ごとに、買い物メモ・在庫に入れる買い物・在庫の控え・食材辞書の控えを1つずつ入れる。
// 買い物メモの送る印は消して、送り終えた状態にする（ゲストは、もともと送らない）。
async function seed(
	database: LocalDatabase,
	ownerScope: InventoryPurchaseOwnerScope,
	name: string,
	{ withPurchase = false }: { withPurchase?: boolean } = {},
) {
	await database.shoppingItems.put({
		...createShoppingItem({ name }),
		ownerScope,
	});
	await database.shoppingSyncOutbox
		.where("ownerScope")
		.equals(ownerScope)
		.delete();

	if (withPurchase) {
		await database.inventoryPurchaseOutbox.add(purchaseEntry(ownerScope));
	}

	if (ownerScope !== "guest") {
		await database.shoppingSyncStates.put({ ownerScope, cursor: 3 });
		await database.inventorySnapshots.put({ ownerScope, items: [], cachedAt });
		await database.ingredientDictionaries.put({
			ownerScope,
			entries: [],
			cachedAt,
		});
	}
}

async function rowsOf(database: LocalDatabase, ownerScope: string) {
	const [items, purchases, snapshot, dictionary, syncState] = await Promise.all(
		[
			database.shoppingItems.where("ownerScope").equals(ownerScope).count(),
			database.inventoryPurchaseOutbox
				.where("ownerScope")
				.equals(ownerScope)
				.count(),
			database.inventorySnapshots.get(ownerScope),
			database.ingredientDictionaries.get(ownerScope),
			database.shoppingSyncStates.get(ownerScope),
		],
	);

	return {
		items,
		purchases,
		snapshot: snapshot !== undefined,
		dictionary: dictionary !== undefined,
		syncState: syncState !== undefined,
	};
}

const empty = {
	items: 0,
	purchases: 0,
	snapshot: false,
	dictionary: false,
	syncState: false,
};

describe("clearAccountLocalData", () => {
	it("送り残しがなければ、その人の買い物メモ・同期の記録・在庫の控え・食材辞書の控えを消す。ゲストとほかの人の分は残す", async () => {
		const database = createDatabase();

		await seed(database, user, "卵");
		await seed(database, otherUser, "牛乳", { withPurchase: true });
		await seed(database, "guest", "豆腐", { withPurchase: true });

		await expect(
			clearAccountLocalData(user, noUnsentAccountChanges, database),
		).resolves.toBe(true);

		expect(await rowsOf(database, user)).toEqual(empty);
		expect(await rowsOf(database, otherUser)).toEqual({
			items: 1,
			purchases: 1,
			snapshot: true,
			dictionary: true,
			syncState: true,
		});
		expect(await rowsOf(database, "guest")).toMatchObject({
			items: 1,
			purchases: 1,
		});
		// 消したことを、サーバーに送る印にしない（ほかの端末のメモは消さない）。
		await expect(database.shoppingSyncOutbox.count()).resolves.toBe(0);
	});

	it("送れていない変更（買い物メモ・在庫に入れる買い物）は、捨てると決めるまで、何も消さない", async () => {
		const database = createDatabase();

		const failed = purchaseEntry(user);

		await seed(database, user, "卵", { withPurchase: true });
		await database.inventoryPurchaseOutbox.add(failed);
		await createDexieInventoryPurchaseOutboxRepository(database).markFailed(
			failed.id,
			"送れませんでした",
		);
		await database.shoppingItems.put({
			...createShoppingItem({ name: "ねぎ" }),
			ownerScope: user,
		});

		const unsent = await findUnsentAccountChanges(user, database);

		// 送れなかった買い物も、送信待ちと同じく数える。
		expect(unsent.purchaseIds).toHaveLength(2);
		expect(unsent.shoppingChangeIds).toHaveLength(1);

		await expect(
			clearAccountLocalData(user, noUnsentAccountChanges, database),
		).resolves.toBe(false);
		expect(await rowsOf(database, user)).toEqual({
			items: 2,
			purchases: 2,
			snapshot: true,
			dictionary: true,
			syncState: true,
		});

		await expect(clearAccountLocalData(user, unsent, database)).resolves.toBe(
			true,
		);
		expect(await rowsOf(database, user)).toEqual(empty);
	});

	describe("確かめてから消すまでの間に、変わったとき", () => {
		it("在庫に入れる買い物が増えていたら、何も消さない", async () => {
			const database = createDatabase();

			await seed(database, user, "卵", { withPurchase: true });

			const unsent = await findUnsentAccountChanges(user, database);

			await database.inventoryPurchaseOutbox.add(purchaseEntry(user));

			await expect(clearAccountLocalData(user, unsent, database)).resolves.toBe(
				false,
			);
			expect(await rowsOf(database, user)).toMatchObject({
				items: 1,
				purchases: 2,
			});
		});

		it("買い物メモが書き直されていたら（送る印が変わる）、何も消さない", async () => {
			const database = createDatabase();
			const item = { ...createShoppingItem({ name: "卵" }), ownerScope: user };

			await database.shoppingItems.put(item);

			const unsent = await findUnsentAccountChanges(user, database);

			await database.shoppingItems.put({ ...item, quantity: 2 });

			await expect(clearAccountLocalData(user, unsent, database)).resolves.toBe(
				false,
			);
			await expect(database.shoppingItems.get(item.id)).resolves.toMatchObject({
				quantity: 2,
			});
		});

		it("送信と重なって、届いた分が消え、新しい買い物が増えていたら、新しい分を消さない", async () => {
			const database = createDatabase();
			const repository = createDexieInventoryPurchaseOutboxRepository(database);

			const sent = purchaseEntry(user);

			await seed(database, user, "卵");
			await repository.enqueue(sent);

			const unsent = await findUnsentAccountChanges(user, database);
			const added = purchaseEntry(user);

			// 確かめたあとに、送信が届いた分を外し、その間に別の購入が入った。
			await repository.remove(sent.id);
			await repository.enqueue(added);

			await expect(clearAccountLocalData(user, unsent, database)).resolves.toBe(
				false,
			);
			await expect(repository.list(user)).resolves.toEqual([added]);
		});

		it("送信で届いた分が外れただけなら、消してよい（どれもサーバーにある）", async () => {
			const database = createDatabase();

			await seed(database, user, "卵", { withPurchase: true });

			const unsent = await findUnsentAccountChanges(user, database);

			await database.inventoryPurchaseOutbox.clear();

			await expect(clearAccountLocalData(user, unsent, database)).resolves.toBe(
				true,
			);
			expect(await rowsOf(database, user)).toEqual(empty);
		});
	});
});
