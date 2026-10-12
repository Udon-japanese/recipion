import * as v from "valibot";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { storageKeys } from "./keys";
import {
	defineStorageItem,
	enumStorageItem,
	jsonStorageItem,
	type KeyValueStorage,
	resetStorageItemsForTest,
	storageKeyPrefix,
} from "./storage-item";

function createStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	const storage: KeyValueStorage & { data: Map<string, string> } = {
		data,
		getItem: (key) => data.get(key) ?? null,
		setItem: (key, value) => {
			data.set(key, value);
		},
		removeItem: (key) => {
			data.delete(key);
		},
	};

	return storage;
}

const brokenStorage: KeyValueStorage = {
	getItem: () => {
		throw new Error("使えない");
	},
	setItem: () => {
		throw new Error("容量超過");
	},
	removeItem: () => {
		throw new Error("使えない");
	},
};

beforeEach(resetStorageItemsForTest);

describe("enumStorageItem", () => {
	const level = enumStorageItem({
		key: storageKeys.expiryEstimateLevel,
		values: ["off", "reliable", "all"],
		defaultValue: "reliable",
	});

	it("保存名に、接頭辞が付く。書いた値を、読める", () => {
		const storage = createStorage();

		expect(level.key).toBe(`${storageKeyPrefix}expiry-estimate-level`);
		expect(level.read(storage)).toBe("reliable");
		expect(level.write("all", storage)).toBe(true);
		expect(storage.data.get(level.key)).toBe("all");
		expect(level.read(storage)).toBe("all");
	});

	it("壊れた値・知らない値は、既定値に戻る", () => {
		expect(level.read(createStorage({ [level.key]: "なにか" }))).toBe(
			"reliable",
		);
	});

	it("使えない保存領域（null・例外）では、例外にせず、既定値で動く。書けないので false", () => {
		expect(level.read(null)).toBe("reliable");
		expect(level.read(brokenStorage)).toBe("reliable");
		expect(level.write("all", brokenStorage)).toBe(false);
		expect(level.write("all", null)).toBe(false);
	});
});

describe("jsonStorageItem", () => {
	const hints = jsonStorageItem({
		key: storageKeys.expiryHints,
		defaultValue: {} as Record<string, number[]>,
		schema: v.record(v.string(), v.array(v.number())),
	});

	it("JSON で保存し、検証して読む。形が違う・壊れた JSON は、既定値", () => {
		const storage = createStorage();

		hints.write({ tofu: [3, 5] }, storage);

		expect(storage.data.get(hints.key)).toBe('{"tofu":[3,5]}');
		expect(hints.read(storage)).toEqual({ tofu: [3, 5] });
		expect(hints.read(createStorage({ [hints.key]: '{"tofu":"x"}' }))).toEqual(
			{},
		);
		expect(hints.read(createStorage({ [hints.key]: "{壊れた" }))).toEqual({});
	});
});

describe("defineStorageItem（既定の保存領域：控えと購読）", () => {
	const item = defineStorageItem<boolean>({
		key: storageKeys.recipeEditorTemplate,
		defaultValue: true,
		parse: (raw) => (raw === "on" ? true : raw === "off" ? false : undefined),
		serialize: (value) => (value ? "on" : "off"),
	});

	beforeEach(() => {
		localStorage.clear();
	});

	it("既定の保存領域（localStorage）に書いて読める。remove で消える", () => {
		expect(item.read()).toBe(true);
		expect(item.write(false)).toBe(true);
		expect(localStorage.getItem(item.key)).toBe("off");
		expect(item.read()).toBe(false);

		item.remove();

		expect(localStorage.getItem(item.key)).toBeNull();
		expect(item.read()).toBe(true);
	});

	it("書き込みで、購読している人に、同じタブでも、通知する。解除したら、通知しない", () => {
		const listener = vi.fn();
		const unsubscribe = item.subscribe(listener);

		item.write(false);

		expect(listener).toHaveBeenCalledTimes(1);

		unsubscribe();
		item.write(true);

		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("他のタブでの変更（storage イベント）も、通知する。全消去（key が null）も", () => {
		const listener = vi.fn();

		item.subscribe(listener);
		window.dispatchEvent(new StorageEvent("storage", { key: item.key }));
		window.dispatchEvent(new StorageEvent("storage", { key: "other" }));
		window.dispatchEvent(new StorageEvent("storage", { key: null }));

		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("保存領域に書けないときは、そのタブの間だけ、値が効く", () => {
		const setItem = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation(() => {
				throw new Error("容量超過");
			});

		expect(item.write(false)).toBe(false);
		expect(item.read()).toBe(false);

		setItem.mockRestore();

		// 書けるようになったら、控えは捨てて、保存領域の値になる。
		expect(item.write(true)).toBe(true);
		expect(localStorage.getItem(item.key)).toBe("on");
		expect(item.read()).toBe(true);
	});
});
