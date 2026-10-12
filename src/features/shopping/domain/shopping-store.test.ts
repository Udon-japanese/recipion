import { describe, expect, it } from "vitest";
import { createShoppingItem } from "./shopping-item";
import {
	createShoppingStore,
	groupShoppingItemsByStore,
	hasShoppingStoreNamed,
	toStoreDefaultKey,
} from "./shopping-store";

const now = new Date("2026-10-12T00:00:00.000Z");
const storeA = createShoppingStore("スーパーA", 0, now, "store-a");
const storeB = createShoppingStore("ドラッグB", 1, now, "store-b");

function item(name: string, storeId: string | null, sortOrder: number) {
	return createShoppingItem({ name, storeId }, now, sortOrder);
}

describe("groupShoppingItemsByStore", () => {
	it("店の並び順でまとめ、「どこでも」を最後に置き、項目の順番は保つ", () => {
		const groups = groupShoppingItemsByStore(
			[
				item("洗剤", "store-b", 0),
				item("卵", null, 1),
				item("牛乳", "store-a", 2),
				item("豆腐", "store-a", 3),
			],
			[storeB, storeA],
		);

		expect(
			groups.map((group) => [
				group.store?.name ?? "どこでも",
				group.items.map((entry) => entry.name),
			]),
		).toEqual([
			["スーパーA", ["牛乳", "豆腐"]],
			["ドラッグB", ["洗剤"]],
			["どこでも", ["卵"]],
		]);
	});

	it("項目のない店は出さず、削除された店の項目は「どこでも」に入れる", () => {
		const groups = groupShoppingItemsByStore(
			[item("卵", "store-gone", 0)],
			[storeA],
		);

		expect(groups).toHaveLength(1);
		expect(groups[0]?.store).toBeNull();
	});
});

describe("店の名前とキー", () => {
	it("全角半角・前後の空白を除いて、同じ名前を見つける", () => {
		expect(hasShoppingStoreNamed([storeA], " スーパーＡ ")).toBe(true);
		expect(hasShoppingStoreNamed([storeA], "スーパーB")).toBe(false);
		expect(hasShoppingStoreNamed([storeA], "スーパーA", "store-a")).toBe(false);
	});

	it("名前が空の店は作れず、食材名のキーは空だと作らない", () => {
		expect(() => createShoppingStore("  ", 0)).toThrow();
		expect(toStoreDefaultKey("  ")).toBeNull();
		expect(toStoreDefaultKey("卵")).toBe(toStoreDefaultKey("　卵 "));
	});
});
