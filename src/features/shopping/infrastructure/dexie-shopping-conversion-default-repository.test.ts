import { beforeEach, describe, expect, it } from "vitest";
import { getLocalDatabase } from "../../../local-db/database";
import type { ShoppingConversionEntry } from "../domain/shopping-conversion-default";
import { createDexieShoppingConversionDefaultRepository } from "./dexie-shopping-conversion-default-repository";

// このテストの持ち主（ゲスト）のメモの保存先。
const dexieShoppingConversionDefaultRepository =
	createDexieShoppingConversionDefaultRepository("guest");

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
		await getLocalDatabase().scopedShoppingConversionMemories.clear();
	});

	it("記憶を鍵で保存して取り出せる。同じ鍵は置き換え、消した鍵はなくなる", async () => {
		const { set, list, remove } = dexieShoppingConversionDefaultRepository;

		await set("a", milk);
		await set("a", {
			...milk,
			usedAt: 2,
			inventoryConversion: {
				...milk.inventoryConversion,
				stockQuantityPerInputUnit: 900,
			},
		});
		await set("b", { ...milk, unitLabel: "パック", usedAt: 3 });
		await set("c", { ...milk, nameKey: "豚肉", unitLabel: null, usedAt: 4 });

		const defaults = await list();

		expect(Object.keys(defaults).sort()).toEqual(["a", "b", "c"]);
		expect(defaults.a?.inventoryConversion.stockQuantityPerInputUnit).toBe(900);
		expect(defaults.c?.unitLabel).toBeNull();

		await remove(["a", "c"]);

		expect(Object.keys(await list())).toEqual(["b"]);
	});

	it("記憶がなければ、空", async () => {
		expect(await dexieShoppingConversionDefaultRepository.list()).toEqual({});
	});
});
