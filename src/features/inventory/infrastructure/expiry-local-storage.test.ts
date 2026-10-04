import { describe, expect, it } from "vitest";
import {
	defaultExpiryEstimateLevel,
	readExpiryEstimateLevel,
	writeExpiryEstimateLevel,
} from "./expiry-estimate-level-storage";
import {
	getLearnedRemainingDays,
	recordExpiryHint,
} from "./expiry-hints-storage";

function createMemoryStorage() {
	const values = new Map<string, string>();

	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value);
		},
	};
}

describe("期限の目安の設定", () => {
	it("保存した値を読み、保存がなければ、既定値（確実なものだけ）", () => {
		const storage = createMemoryStorage();

		expect(readExpiryEstimateLevel(storage)).toBe(defaultExpiryEstimateLevel);
		expect(defaultExpiryEstimateLevel).toBe("reliable");

		writeExpiryEstimateLevel("all", storage);
		expect(readExpiryEstimateLevel(storage)).toBe("all");

		writeExpiryEstimateLevel("off", storage);
		expect(readExpiryEstimateLevel(storage)).toBe("off");
	});

	it("不正な値や、使えない保存領域では、既定値で動く", () => {
		const storage = createMemoryStorage();

		storage.setItem("recipion:expiry-estimate-level", "invalid");
		expect(readExpiryEstimateLevel(storage)).toBe("reliable");
		expect(readExpiryEstimateLevel(null)).toBe("reliable");
		expect(() => writeExpiryEstimateLevel("all", null)).not.toThrow();
		expect(
			readExpiryEstimateLevel({
				getItem: () => {
					throw new Error("blocked");
				},
				setItem: () => {},
			}),
		).toBe("reliable");
	});
});

describe("期限の覚え書き（過去の入力）", () => {
	const record = (
		storage: ReturnType<typeof createMemoryStorage>,
		name: string,
		days: number,
	) =>
		recordExpiryHint(
			{
				ingredientName: name,
				acquiredOn: "2026-10-01",
				expiresOn: `2026-10-${String(1 + days).padStart(2, "0")}`,
				storage: "fridge",
			},
			storage,
		);

	it("覚えた日数の、中央値を返す。別名は、同じ食材として数える", () => {
		const storage = createMemoryStorage();

		record(storage, "鶏もも肉", 3);
		record(storage, "もも肉", 5);
		record(storage, "鶏もも", 4);

		expect(getLearnedRemainingDays("鶏もも肉", storage)).toBe(4);
		expect(getLearnedRemainingDays("牛乳", storage)).toBeNull();
	});

	it("直近の5件だけを使う", () => {
		const storage = createMemoryStorage();

		for (const days of [1, 1, 1, 1, 1, 9, 9, 9, 9, 9]) {
			record(storage, "牛乳", days);
		}

		expect(getLearnedRemainingDays("牛乳", storage)).toBe(9);
	});

	it("冷凍の入力、買った日より前の日付、遠すぎる日付は、覚えない", () => {
		const storage = createMemoryStorage();

		recordExpiryHint(
			{
				ingredientName: "牛乳",
				acquiredOn: "2026-10-01",
				expiresOn: "2026-12-01",
				storage: "freezer",
			},
			storage,
		);
		recordExpiryHint(
			{
				ingredientName: "牛乳",
				acquiredOn: "2026-10-05",
				expiresOn: "2026-10-01",
				storage: null,
			},
			storage,
		);
		recordExpiryHint(
			{
				ingredientName: "牛乳",
				acquiredOn: "2026-10-05",
				expiresOn: "2030-10-01",
				storage: null,
			},
			storage,
		);

		expect(getLearnedRemainingDays("牛乳", storage)).toBeNull();
	});

	it("壊れた保存データでも、動く", () => {
		const storage = createMemoryStorage();

		storage.setItem("recipion:expiry-hints", "{broken");
		expect(getLearnedRemainingDays("牛乳", storage)).toBeNull();
		expect(() => record(storage, "牛乳", 3)).not.toThrow();
		expect(getLearnedRemainingDays("牛乳", storage)).toBe(3);
	});
});
