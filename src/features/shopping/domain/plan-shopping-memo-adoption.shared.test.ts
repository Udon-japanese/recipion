import * as v from "valibot";
import { describe, expect, it } from "vitest";
import cases from "../../../../shared-data/test-cases/shopping-memo-adoption.json";
import {
	hasShoppingMemoToAdopt,
	planShoppingMemoAdoption,
} from "./plan-shopping-memo-adoption";
import {
	shoppingBranchSchema,
	shoppingConversionMemorySchema,
	shoppingItemMemorySchema,
	shoppingItemSchema,
	shoppingStoreDefaultSchema,
	shoppingStoreSchema,
} from "./shopping-record-schemas";

const memoDataSchema = v.object({
	items: v.array(shoppingItemSchema),
	stores: v.array(shoppingStoreSchema),
	branches: v.array(shoppingBranchSchema),
	storeDefaults: v.array(shoppingStoreDefaultSchema),
	conversionMemories: v.array(shoppingConversionMemorySchema),
	itemMemories: v.array(shoppingItemMemorySchema),
});

const memo = (input: unknown) => v.parse(memoDataSchema, input);

// アプリ（Kotlin）も同じテストデータで確かめる（引き取りの合わせ方が、Web とアプリでずれないように）。
describe("planShoppingMemoAdoption（共通のテストデータ）", () => {
	it.each(cases.plan)("$name", ({ guest, account, expected }) => {
		expect(planShoppingMemoAdoption(memo(guest), memo(account))).toEqual({
			...memo(expected),
			mergedStoreCount: expected.mergedStoreCount,
		});
	});

	it.each(cases.hasMemo)("移すものがあるか：$name", ({ guest, expected }) => {
		expect(hasShoppingMemoToAdopt(memo(guest))).toBe(expected);
	});
});
