import { beforeEach, describe, expect, it } from "vitest";
import { LocalDatabase } from "#/local-db/database";
import { createShoppingItem, type ShoppingItem } from "../domain/shopping-item";
import { createShoppingStore } from "../domain/shopping-store";
import {
	planShoppingPush,
	type ShoppingPushRecord,
	type StoredShoppingRecord,
} from "../domain/shopping-sync-push";
import { clearAccountShoppingMemo } from "../infrastructure/dexie-shopping-sign-out";
import { createDexieShoppingSyncStore } from "../infrastructure/dexie-shopping-sync-store";
import { readOwnedShoppingData } from "../infrastructure/read-owned-shopping-data";
import {
	type ShoppingSyncRemote,
	syncShoppingMemo,
} from "./sync-shopping-memo";

const user = "user:user-1" as const;

// サーバーの代わり。行の当て方は、本物のサーバーと同じ planShoppingPush。
// loseNextResponse：次の送信は、サーバーで当てたあと、返事が端末に届かない（通信が切れた）。
function createFakeServer(pageSize = 500) {
	let version = 0;
	let loseNextResponse = false;
	const rows = new Map<string, StoredShoppingRecord>();
	const pushed: ShoppingPushRecord[][] = [];
	const remote: ShoppingSyncRemote = {
		async push(_ownerScope, records) {
			pushed.push([...records]);

			const plan = planShoppingPush([...rows.values()], records, version);

			for (const record of plan.writes) {
				rows.set(`${record.kind}/${record.id}`, record);
			}
			version = plan.version;

			if (loseNextResponse) {
				loseNextResponse = false;
				throw new Error("Failed to fetch");
			}

			return plan.results;
		},
		async pull(_ownerScope, after) {
			const newer = [...rows.values()]
				.filter((row) => row.version > after)
				.sort((a, b) => a.version - b.version)
				.map(({ changeId: _changeId, ...record }) => record);
			const page = newer.slice(0, pageSize);

			return {
				records: page,
				cursor: page.at(-1)?.version ?? after,
				hasMore: newer.length > pageSize,
			};
		},
	};

	return {
		remote,
		rows,
		pushed,
		version: () => version,
		loseNextResponse: () => {
			loseNextResponse = true;
		},
	};
}

let deviceCount = 0;

// 端末ごとに、別の IndexedDB。
function createDevice(server: ReturnType<typeof createFakeServer>) {
	deviceCount += 1;
	const database = new LocalDatabase(`sync-test-${deviceCount}`);
	const store = createDexieShoppingSyncStore(database);

	return {
		database,
		store,
		sync: () => syncShoppingMemo(user, store, server.remote),
		addItem: (name: string, overrides: Partial<ShoppingItem> = {}) => {
			const item = { ...createShoppingItem({ name }), ...overrides };

			return database.shoppingItems
				.put({ ...item, ownerScope: user })
				.then(() => item);
		},
		updateItem: (item: ShoppingItem, changes: Partial<ShoppingItem>) =>
			database.shoppingItems.put({ ...item, ...changes, ownerScope: user }),
		addStore: (name: string, sortOrder = 0) => {
			const store = createShoppingStore(name, sortOrder);

			return database.shoppingStores
				.put({ ...store, ownerScope: user })
				.then(() => store);
		},
		read: () => readOwnedShoppingData(user, database),
		pendingCount: () => database.shoppingSyncOutbox.count(),
	};
}

async function itemsOf(device: ReturnType<typeof createDevice>) {
	return (await device.read()).items.map(({ name, quantity }) => ({
		name,
		quantity,
	}));
}

describe("syncShoppingMemo", () => {
	let server: ReturnType<typeof createFakeServer>;

	beforeEach(() => {
		server = createFakeServer();
	});

	it("書いた行を送り、別の端末が受け取る（足した行・消した行のどちらも）", async () => {
		const deviceA = createDevice(server);
		const deviceB = createDevice(server);
		const egg = await deviceA.addItem("卵");
		const milk = await deviceA.addItem("牛乳");

		await deviceA.sync();
		await deviceB.sync();

		expect(
			(await deviceB.read()).items.map((item) => item.name).sort(),
		).toEqual(["卵", "牛乳"].sort());
		expect(await deviceA.pendingCount()).toBe(0);

		await deviceA.database.shoppingItems.delete(milk.id);
		await deviceA.sync();
		await deviceB.sync();

		expect((await deviceB.read()).items.map((item) => item.id)).toEqual([
			egg.id,
		]);
	});

	it("受け取った行は、送り返さない", async () => {
		const deviceA = createDevice(server);
		const deviceB = createDevice(server);

		await deviceA.addItem("卵");
		await deviceA.sync();
		await deviceB.sync();
		server.pushed.length = 0;

		await deviceB.sync();

		expect(server.pushed).toEqual([]);
		expect(await deviceB.pendingCount()).toBe(0);
	});

	it("受け取ったあとに変えた行は、ほかの端末の変更として、そのまま当たる", async () => {
		const deviceA = createDevice(server);
		const deviceB = createDevice(server);
		const egg = await deviceA.addItem("卵");

		await deviceA.sync();
		await deviceB.sync();
		await deviceB.updateItem(egg, { quantity: 6 });
		await deviceB.sync();
		await deviceA.sync();

		expect(await itemsOf(deviceA)).toEqual([{ name: "卵", quantity: 6 }]);
	});

	describe("同じ行を、2台で続けて変えたとき", () => {
		it("先にサーバーに届いた変更が勝ち、あとから届いた古い変更（相手の変更を知らない）は当てない", async () => {
			const deviceA = createDevice(server);
			const deviceB = createDevice(server);
			const egg = await deviceA.addItem("卵");

			await deviceA.sync();
			await deviceB.sync();

			// A が数を変えて送ったあとに、B も（A の変更を受け取らずに）名前を変える。
			await deviceA.updateItem(egg, { quantity: 3 });
			await deviceA.sync();
			await deviceB.updateItem(egg, { name: "卵（大）" });
			await deviceB.sync();
			await deviceA.sync();

			for (const device of [deviceA, deviceB]) {
				expect(await itemsOf(device)).toEqual([{ name: "卵", quantity: 3 }]);
				expect(await device.pendingCount()).toBe(0);
			}
		});

		it("別の端末で消した項目は、古い変更を送っても、よみがえらない", async () => {
			const deviceA = createDevice(server);
			const deviceB = createDevice(server);
			const egg = await deviceA.addItem("卵");

			await deviceA.sync();
			await deviceB.sync();
			await deviceA.database.shoppingItems.delete(egg.id);
			await deviceA.sync();
			await deviceB.updateItem(egg, { quantity: 2 });
			await deviceB.sync();

			expect((await deviceB.read()).items).toEqual([]);
			expect(server.rows.get(`item/${egg.id}`)?.deleted).toBe(true);
		});
	});

	describe("送ったが、返事を受け取れなかったとき", () => {
		it("送り直しても、二重に当てない（版は進まない）", async () => {
			const deviceA = createDevice(server);

			await deviceA.addItem("卵");
			server.loseNextResponse();
			await expect(deviceA.sync()).rejects.toThrow();
			expect(await deviceA.pendingCount()).toBe(1);

			const versionAfterFirstPush = server.version();

			await deviceA.sync();

			expect(server.version()).toBe(versionAfterFirstPush);
			expect(await deviceA.pendingCount()).toBe(0);
		});

		it("その間に別の端末が変えていたら、送り直した古い変更で上書きしない", async () => {
			const deviceA = createDevice(server);
			const deviceB = createDevice(server);
			const egg = await deviceA.addItem("卵");

			await deviceA.sync();
			await deviceB.sync();

			await deviceA.updateItem(egg, { quantity: 2 });
			server.loseNextResponse();
			await expect(deviceA.sync()).rejects.toThrow();

			// A の変更は届いていた。B は、それを受け取ってから、また変える。
			await deviceB.sync();
			await deviceB.updateItem(egg, { quantity: 5 });
			await deviceB.sync();

			await deviceA.sync();

			expect(server.rows.get(`item/${egg.id}`)).toEqual(
				expect.objectContaining({
					data: expect.objectContaining({ quantity: 5 }),
				}),
			);
			expect(await itemsOf(deviceA)).toEqual([{ name: "卵", quantity: 5 }]);
		});

		it("その間に同じ端末でまた変えた変更は、届いていた自分の変更の上に当たる", async () => {
			const deviceA = createDevice(server);
			const deviceB = createDevice(server);
			const egg = await deviceA.addItem("卵");

			await deviceA.sync();
			await deviceA.updateItem(egg, { quantity: 2 });
			server.loseNextResponse();
			await expect(deviceA.sync()).rejects.toThrow();

			await deviceA.updateItem(egg, { quantity: 4 });
			await deviceA.sync();
			await deviceB.sync();

			expect(await itemsOf(deviceA)).toEqual([{ name: "卵", quantity: 4 }]);
			expect(await itemsOf(deviceB)).toEqual([{ name: "卵", quantity: 4 }]);
		});
	});

	it("送れなかったら、印を残す（次に、また送る）", async () => {
		const deviceA = createDevice(server);

		await deviceA.addItem("卵");
		await deviceA.sync();
		await deviceA.addItem("牛乳");

		const failing = createDexieShoppingSyncStore(deviceA.database);

		await expect(
			syncShoppingMemo(user, failing, {
				...server.remote,
				push: () => Promise.reject(new Error("Failed to fetch")),
			}),
		).rejects.toThrow();
		expect(await deviceA.pendingCount()).toBe(1);

		await deviceA.sync();
		expect(await deviceA.pendingCount()).toBe(0);
		expect(server.rows.size).toBe(2);
	});

	describe("この端末で初めて同期するとき", () => {
		it("サーバーのメモに端末のメモを合わせる（同じ名前の店は1つにまとめ、端末の分だけ送る）", async () => {
			const deviceA = createDevice(server);
			const storeA = await deviceA.addStore("スーパー");

			await deviceA.addItem("卵", { storeId: storeA.id });
			await deviceA.sync();
			server.pushed.length = 0;

			const deviceB = createDevice(server);
			const storeB = await deviceB.addStore(" スーパー ");

			await deviceB.addItem("牛乳", { storeId: storeB.id });
			await deviceB.sync();

			const memo = await deviceB.read();

			expect(memo.stores.map((store) => store.id)).toEqual([storeA.id]);
			expect(
				Object.fromEntries(memo.items.map((item) => [item.name, item.storeId])),
			).toEqual({ 卵: storeA.id, 牛乳: storeA.id });
			expect(server.pushed.flat().map((record) => record.kind)).toEqual([
				"item",
			]);

			await deviceA.sync();

			expect(
				(await deviceA.read()).items.map((item) => item.name).sort(),
			).toEqual(["卵", "牛乳"].sort());
		});

		it("いつも買う店・換算の記憶は、同じ食材がサーバーにあればサーバーの方を残し、端末だけのものは送る", async () => {
			const deviceA = createDevice(server);
			const storeA = await deviceA.addStore("スーパー");
			const conversion = {
				inputUnitCode: "pack",
				stockUnitCode: "count" as const,
				stockUnitLabel: "個",
				stockQuantityPerInputUnit: 10,
				trackingMode: "exact" as const,
			};

			await deviceA.database.scopedShoppingStoreDefaults.put({
				ownerScope: user,
				nameKey: "卵",
				storeId: storeA.id,
			});
			await deviceA.database.scopedShoppingConversionMemories.put({
				ownerScope: user,
				key: "卵|パック",
				nameKey: "卵",
				unitLabel: "パック",
				inventoryConversion: conversion,
				usedAt: 1,
			});
			await deviceA.sync();

			const deviceB = createDevice(server);
			const storeB = await deviceB.addStore("八百屋", 0);

			await deviceB.database.scopedShoppingStoreDefaults.bulkPut([
				{ ownerScope: user, nameKey: "卵", storeId: storeB.id },
				{ ownerScope: user, nameKey: "ねぎ", storeId: storeB.id },
			]);
			await deviceB.database.scopedShoppingConversionMemories.put({
				ownerScope: user,
				key: "卵|パック",
				nameKey: "卵",
				unitLabel: "パック",
				inventoryConversion: { ...conversion, stockQuantityPerInputUnit: 6 },
				usedAt: 2,
			});
			await deviceB.sync();

			const memo = await deviceB.read();

			expect(
				Object.fromEntries(
					memo.storeDefaults.map((entry) => [entry.nameKey, entry.storeId]),
				),
			).toEqual({ 卵: storeA.id, ねぎ: storeB.id });
			expect(
				memo.conversionMemories.map(
					(memory) => memory.inventoryConversion.stockQuantityPerInputUnit,
				),
			).toEqual([10]);
			expect(server.rows.get("storeDefault/ねぎ")?.deleted).toBe(false);
			expect(await deviceB.pendingCount()).toBe(0);
		});
	});

	it("ログアウトで端末のメモを消しても、もう一度ログインすると、サーバーから受け取り直す", async () => {
		const device = createDevice(server);

		await device.addItem("卵");
		await device.sync();
		await clearAccountShoppingMemo(
			user,
			{ discardUnsent: false },
			device.database,
		);

		expect((await device.read()).items).toEqual([]);

		await device.sync();

		expect(await itemsOf(device)).toEqual([{ name: "卵", quantity: 1 }]);
		expect(await device.pendingCount()).toBe(0);
	});

	it("受け取る行が多いときは、何回かに分けて受け取る", async () => {
		server = createFakeServer(2);
		const deviceA = createDevice(server);

		for (const name of ["卵", "牛乳", "豆腐", "納豆", "ねぎ"]) {
			await deviceA.addItem(name);
		}

		await deviceA.sync();

		const deviceB = createDevice(server);
		const result = await deviceB.sync();

		expect((await deviceB.read()).items).toHaveLength(5);
		expect(result.pulledCount).toBe(5);
	});
});

describe("createDexieShoppingSyncStore", () => {
	it("送っている間に、また書かれた行は、送り終えても印を外さない", async () => {
		const device = createDevice(createFakeServer());
		const egg = await device.addItem("卵");
		const { entries } = await device.store.readPending(user, 100);

		await device.updateItem(egg, { quantity: 2 });
		await device.store.acknowledge(user, entries, [
			{ status: "applied", version: 1 },
		]);

		expect(await device.pendingCount()).toBe(1);
	});

	it("ほかの持ち主の同じ ID の行は、受け取った行で消したり上書きしたりしない", async () => {
		const device = createDevice(createFakeServer());
		const guestItem = createShoppingItem({ name: "卵" });

		await device.database.shoppingItems.put({
			...guestItem,
			ownerScope: "guest",
		});
		await device.store.applyPulled(
			user,
			[
				{
					kind: "item",
					id: guestItem.id,
					deleted: true,
					data: null,
					version: 1,
				},
			],
			1,
		);

		await expect(
			device.database.shoppingItems.get(guestItem.id),
		).resolves.toEqual(expect.objectContaining({ ownerScope: "guest" }));
	});
});
