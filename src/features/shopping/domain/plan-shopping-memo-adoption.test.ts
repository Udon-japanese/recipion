import { describe, expect, it } from "vitest";
import {
	hasShoppingMemoToAdopt,
	planShoppingMemoAdoption,
	type ShoppingMemoData,
} from "./plan-shopping-memo-adoption";
import { createShoppingBranch } from "./shopping-branch";
import { createShoppingItem, type ShoppingItem } from "./shopping-item";
import { createShoppingStore } from "./shopping-store";

const now = new Date("2026-11-07T00:00:00.000Z");
const conversion = {
	inputUnitCode: "パック",
	stockUnitCode: "count" as const,
	stockUnitLabel: "個",
	stockQuantityPerInputUnit: 10,
	trackingMode: "exact" as const,
};

function item(id: string, input: Partial<ShoppingItem> = {}): ShoppingItem {
	return { ...createShoppingItem({ name: id }, now), id, ...input };
}

const empty: ShoppingMemoData = {
	items: [],
	stores: [],
	branches: [],
	storeDefaults: [],
	conversionMemories: [],
};

describe("planShoppingMemoAdoption", () => {
	const accountStore = {
		...createShoppingStore("駅前", 0, now),
		id: "a-store",
	};
	const account: ShoppingMemoData = {
		...empty,
		items: [item("a-1", { sortOrder: 4 })],
		stores: [accountStore],
		branches: [
			{ ...createShoppingBranch({ condition: "安ければ" }, 2, now), id: "a-b" },
		],
		storeDefaults: [{ nameKey: "卵", storeId: "a-store" }],
		conversionMemories: [
			{
				key: "卵\tパック",
				nameKey: "卵",
				unitLabel: "パック",
				inventoryConversion: conversion,
				usedAt: 1,
			},
		],
	};
	const guest: ShoppingMemoData = {
		items: [
			item("g-2", { sortOrder: 9, storeId: "g-near" }),
			item("g-1", { sortOrder: 1, storeId: "g-same" }),
		],
		stores: [
			// 同じ名前（前後の空白・全角半角の違いは見ない）の店は、アカウントの店にまとめる。
			{ ...createShoppingStore(" 駅前", 0, now), id: "g-same" },
			{ ...createShoppingStore("近所", 1, now), id: "g-near" },
		],
		branches: [
			{
				...createShoppingBranch({ condition: "売っていたら" }, 0, now),
				id: "g-b",
			},
		],
		storeDefaults: [
			{ nameKey: "卵", storeId: "g-near" },
			{ nameKey: "牛乳", storeId: "g-same" },
		],
		conversionMemories: [
			{
				key: "卵\tパック",
				nameKey: "卵",
				unitLabel: "パック",
				inventoryConversion: { ...conversion, stockQuantityPerInputUnit: 6 },
				usedAt: 2,
			},
			{
				key: "牛乳\t本",
				nameKey: "牛乳",
				unitLabel: "本",
				inventoryConversion: conversion,
				usedAt: 2,
			},
		],
	};
	const adoption = planShoppingMemoAdoption(guest, account);

	it("同じ名前の店はまとめ、ほかの店は後ろに足す", () => {
		expect(adoption.mergedStoreCount).toBe(1);
		expect(adoption.stores).toEqual([{ ...guest.stores[1], sortOrder: 1 }]);
	});

	it("項目は、ゲストの並びのまま後ろに足し、まとめた店に付け替える", () => {
		expect(
			adoption.items.map(({ id, sortOrder, storeId }) => ({
				id,
				sortOrder,
				storeId,
			})),
		).toEqual([
			{ id: "g-1", sortOrder: 5, storeId: "a-store" },
			{ id: "g-2", sortOrder: 6, storeId: "g-near" },
		]);
		expect(adoption.branches).toEqual([{ ...guest.branches[0], sortOrder: 3 }]);
	});

	it("いつも買う店・換算の記憶は、アカウントにある食材はアカウントの方を残す", () => {
		expect(adoption.storeDefaults).toEqual([
			{ nameKey: "牛乳", storeId: "a-store" },
		]);
		expect(adoption.conversionMemories.map((memory) => memory.key)).toEqual([
			"牛乳\t本",
		]);
	});
});

describe("hasShoppingMemoToAdopt", () => {
	it.each([
		{ title: "空", data: empty, expected: false },
		{
			title: "購入済みの項目だけ",
			data: { ...empty, items: [item("p", { status: "purchased" })] },
			expected: false,
		},
		{
			title: "まだ買っていない項目",
			data: { ...empty, items: [item("p")] },
			expected: true,
		},
		{
			title: "店だけ",
			data: { ...empty, stores: [createShoppingStore("駅前", 0, now)] },
			expected: true,
		},
	])("$title → $expected", ({ data, expected }) => {
		expect(hasShoppingMemoToAdopt(data)).toBe(expected);
	});
});
