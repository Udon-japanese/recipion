import { describe, expect, it } from "vitest";
import { readRememberedAmounts, rememberAmount } from "./amount-memory-storage";

function createMemoryStorage() {
	const values = new Map<string, string>();

	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value);
		},
	};
}

describe("打った量の記憶", () => {
	it("新しい順に、同じ量は1つにまとめて、3つまで覚える。単位が違えば、別に覚える", () => {
		const storage = createMemoryStorage();
		const remember = (amount: number, stockUnitLabel = "g") =>
			rememberAmount(
				{ ingredientName: "鶏もも肉", stockUnitLabel, amount },
				storage,
			);

		for (const amount of [100, 200, 100, 300, 250]) {
			remember(amount);
		}
		remember(1, "枚");

		expect(readRememberedAmounts("鶏もも肉", "g", storage)).toEqual([
			250, 300, 100,
		]);
		expect(readRememberedAmounts("鶏もも肉", "枚", storage)).toEqual([1]);
	});

	it("0 以下や、数でない量は、覚えない", () => {
		const storage = createMemoryStorage();

		rememberAmount(
			{ ingredientName: "牛乳", stockUnitLabel: "ml", amount: 0 },
			storage,
		);
		rememberAmount(
			{ ingredientName: "牛乳", stockUnitLabel: "ml", amount: Number.NaN },
			storage,
		);

		expect(readRememberedAmounts("牛乳", "ml", storage)).toEqual([]);
	});
});
