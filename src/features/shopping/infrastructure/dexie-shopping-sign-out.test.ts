import { beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "#/local-db/database";
import { createShoppingItem } from "../domain/shopping-item";
import {
	clearAccountShoppingMemo,
	countUnsentShoppingChanges,
} from "./dexie-shopping-sign-out";

const user = "user:user-1" as const;
const otherUser = "user:user-2" as const;

async function putItem(ownerScope: "guest" | `user:${string}`, name: string) {
	await getLocalDatabase().shoppingItems.put({
		...createShoppingItem({ name }),
		ownerScope,
	});
}

async function namesOf(ownerScope: string) {
	const items = await getLocalDatabase()
		.shoppingItems.where("ownerScope")
		.equals(ownerScope)
		.toArray();

	return items.map((item) => item.name);
}

describe("clearAccountShoppingMemo", () => {
	beforeEach(async () => {
		const database = getLocalDatabase();

		await database.shoppingItems.clear();
		await database.shoppingSyncOutbox.clear();
		await database.shoppingSyncStates.clear();
		await database.shoppingSyncVersions.clear();
	});

	it("送り残しがなければ、その人のメモと同期の記録だけを消す（ゲスト・ほかの人のメモは残す）", async () => {
		const database = getLocalDatabase();

		await putItem(user, "卵");
		await putItem(otherUser, "牛乳");
		await putItem("guest", "豆腐");
		await database.shoppingSyncOutbox.clear();
		await database.shoppingSyncStates.bulkPut([
			{ ownerScope: user, cursor: 3 },
			{ ownerScope: otherUser, cursor: 5 },
		]);

		await expect(
			clearAccountShoppingMemo(user, { discardUnsent: false }),
		).resolves.toBe(true);

		expect(await namesOf(user)).toEqual([]);
		expect(await namesOf(otherUser)).toEqual(["牛乳"]);
		expect(await namesOf("guest")).toEqual(["豆腐"]);
		await expect(
			database.shoppingSyncStates.get(user),
		).resolves.toBeUndefined();
		await expect(database.shoppingSyncStates.get(otherUser)).resolves.toEqual({
			ownerScope: otherUser,
			cursor: 5,
		});
		// 消したことを、サーバーに送る印にしない（ほかの端末のメモは消さない）。
		await expect(database.shoppingSyncOutbox.count()).resolves.toBe(0);
	});

	it("送り残しがあれば、「消してログアウト」を選ぶまで、何も消さない", async () => {
		await putItem(user, "卵");

		expect(await countUnsentShoppingChanges(user)).toBe(1);
		await expect(
			clearAccountShoppingMemo(user, { discardUnsent: false }),
		).resolves.toBe(false);
		expect(await namesOf(user)).toEqual(["卵"]);
		expect(await countUnsentShoppingChanges(user)).toBe(1);

		await expect(
			clearAccountShoppingMemo(user, { discardUnsent: true }),
		).resolves.toBe(true);
		expect(await namesOf(user)).toEqual([]);
		expect(await countUnsentShoppingChanges(user)).toBe(0);
	});

	it("ほかの人の送り残しは、数えず、消さない", async () => {
		await putItem(otherUser, "牛乳");

		expect(await countUnsentShoppingChanges(user)).toBe(0);
		await clearAccountShoppingMemo(user, { discardUnsent: true });

		expect(await countUnsentShoppingChanges(otherUser)).toBe(1);
		expect(await namesOf(otherUser)).toEqual(["牛乳"]);
	});
});
