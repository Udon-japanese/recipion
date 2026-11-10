import { describe, expect, it } from "vitest";
import { createShoppingItem } from "./shopping-item";
import { parseShoppingSyncRecord } from "./shopping-sync-record";

const item = createShoppingItem({ name: "卵" });

describe("parseShoppingSyncRecord", () => {
	it.each([
		["項目", { kind: "item", id: item.id, deleted: false, data: item }],
		["消した行", { kind: "store", id: "store-1", deleted: true, data: null }],
		[
			"いつも買う店",
			{
				kind: "storeDefault",
				id: "卵",
				deleted: false,
				data: { nameKey: "卵", storeId: "store-1" },
			},
		],
		[
			"いつもの買い方",
			{
				kind: "itemMemory",
				id: "卵",
				deleted: false,
				data: {
					nameKey: "卵",
					quantity: 2,
					unitLabel: "パック",
					categoryId: "eggs",
					categoryAssignment: "manual",
					usedAt: 1,
				},
			},
		],
	])("正しい形の行は、そのまま読める（%s）", (_label, input) => {
		expect(parseShoppingSyncRecord(input)).toEqual(input);
	});

	it.each([
		[
			"行の ID が中身と違う",
			{ kind: "item", id: "other-id", deleted: false, data: item },
		],
		["種類が違う", { kind: "recipe", id: item.id, deleted: false, data: item }],
		[
			"中身の形が違う",
			{
				kind: "item",
				id: item.id,
				deleted: false,
				data: { ...item, quantity: 0 },
			},
		],
		[
			"いつもの買い方の行の ID が、食材名のキーと違う",
			{
				kind: "itemMemory",
				id: "牛乳",
				deleted: false,
				data: {
					nameKey: "卵",
					quantity: 2,
					unitLabel: "パック",
					categoryId: null,
					categoryAssignment: null,
					usedAt: 1,
				},
			},
		],
		[
			"消した行に中身がある",
			{ kind: "item", id: item.id, deleted: true, data: item },
		],
	])("合わない行は、断る（%s）", (_label, input) => {
		expect(() => parseShoppingSyncRecord(input)).toThrow();
	});
});
