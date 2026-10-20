import { beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingConversionEntry } from "../domain/shopping-conversion-default";
import { toConversionMemoryKey } from "../domain/shopping-conversion-default";
import { dexieShoppingConversionDefaultRepository } from "./dexie-shopping-conversion-default-repository";

const milk: ShoppingConversionEntry = {
	nameKey: "牛乳",
	unitLabel: "本",
	usedAt: 1,
	inventoryConversion: {
		inputUnitCode: "本",
		stockUnitCode: "ml",
		stockUnitLabel: "ml",
		stockQuantityPerInputUnit: 1000,
		trackingMode: "estimated",
	},
};

describe("dexieShoppingConversionDefaultRepository", () => {
	beforeEach(async () => {
		await getLocalDatabase().shoppingConversionMemories.clear();
	});

	it("記憶を食材×単位で保存して取り出せる。同じ食材×単位は置き換え、違う単位は別に残る", async () => {
		const { set, list } = dexieShoppingConversionDefaultRepository;

		await set(milk);
		await set({
			...milk,
			usedAt: 2,
			inventoryConversion: {
				...milk.inventoryConversion,
				stockQuantityPerInputUnit: 900,
			},
		});
		await set({ ...milk, unitLabel: "パック", usedAt: 3 });
		await set({ ...milk, nameKey: "豚肉", unitLabel: null, usedAt: 4 });

		const defaults = await list();

		expect(Object.keys(defaults).sort()).toEqual(
			[
				toConversionMemoryKey("牛乳", "本"),
				toConversionMemoryKey("牛乳", "パック"),
				toConversionMemoryKey("豚肉", null),
			].sort(),
		);
		expect(
			defaults[toConversionMemoryKey("牛乳", "本")]?.inventoryConversion
				.stockQuantityPerInputUnit,
		).toBe(900);
		expect(defaults[toConversionMemoryKey("豚肉", null)]?.unitLabel).toBeNull();
	});

	it("記憶がなければ、空", async () => {
		expect(await dexieShoppingConversionDefaultRepository.list()).toEqual({});
	});
});
