import { describe, expect, it } from "vitest";
import {
	type ShoppingConversionDefaults,
	toConversionDefaultKey,
} from "./shopping-conversion-default";
import type { ShoppingItemMemories } from "./shopping-item-memory";
import { listShoppingUnitChips } from "./shopping-unit-chips";

function key(name: string): string {
	return toConversionDefaultKey(name) ?? "";
}

// いつもの買い方の記憶（食材名 → 単位・使った時刻）。
function memories(
	entries: readonly [name: string, unitLabel: string, usedAt: number][],
): ShoppingItemMemories {
	return Object.fromEntries(
		entries.map(([name, unitLabel, usedAt]) => [
			key(name),
			{
				nameKey: key(name),
				quantity: 1,
				unitLabel,
				categoryId: null,
				categoryAssignment: "automatic",
				usedAt,
			},
		]),
	);
}

// 換算の記憶（食材名 → 単位・使った時刻）。
function conversions(
	entries: readonly [name: string, unitLabel: string, usedAt: number][],
): ShoppingConversionDefaults {
	return Object.fromEntries(
		entries.map(([name, unitLabel, usedAt], index) => [
			`memory-${index}`,
			{
				nameKey: key(name),
				unitLabel,
				usedAt,
				inventoryConversion: {
					inputUnitCode: unitLabel,
					stockUnitCode: "count",
					stockUnitLabel: "個",
					stockQuantityPerInputUnit: 1,
					trackingMode: "estimated",
				},
			},
		]),
	);
}

const kgPreferred = (unit: string) => (unit === "g" ? "kg" : unit);

describe("listShoppingUnitChips（単位のチップの並び）", () => {
	it.each([
		{
			title: "名前も記憶もなければ、固定の単位",
			itemName: "",
			itemMemories: {},
			conversionDefaults: {},
			expected: ["個", "本", "パック", "袋", "g"],
		},
		{
			// 牛乳：一般的な売られ方（本）→ よく使う数量（ml・L は同じチップ）→ 固定の単位
			title: "カタログの単位を先に並べ、足りない分を固定の単位で埋める",
			itemName: "牛乳",
			itemMemories: {},
			conversionDefaults: {},
			expected: ["本", "ml", "個", "パック", "袋"],
		},
		{
			// 鶏もも肉：パック → 重さのある数え方（枚）→ 在庫の単位（g）
			title: "カタログの重さのある数え方と、在庫の単位も並べる",
			itemName: "鶏もも肉",
			itemMemories: {},
			conversionDefaults: {},
			expected: ["パック", "枚", "g", "個", "本"],
		},
		{
			title:
				"その食材で使った単位を、いちばん先に（前回 → 換算の記憶の新しい順）",
			itemName: "謎の食材",
			itemMemories: memories([["謎の食材", "袋", 1]]),
			conversionDefaults: conversions([
				["謎の食材", "缶", 1],
				["謎の食材", "箱", 2],
			]),
			expected: ["袋", "箱", "缶", "個", "本"],
		},
		{
			title: "前回 L で買った牛乳は、L のチップ（ml と同じチップを、重ねない）",
			itemName: "牛乳",
			itemMemories: memories([["牛乳", "L", 1]]),
			conversionDefaults: {},
			expected: ["L", "本", "個", "パック", "袋"],
		},
		{
			title: "cc は、ml のチップにする",
			itemName: "謎の食材",
			itemMemories: memories([["謎の食材", "cc", 1]]),
			conversionDefaults: {},
			expected: ["ml", "個", "本", "パック", "袋"],
		},
		{
			// 束は2つの食材、缶は1つの食材で使った
			title: "ほかの食材も含めて、使った食材の多い単位を、固定の単位の前に",
			itemName: "謎の食材",
			itemMemories: memories([
				["にら", "束", 1],
				["ほうれん草", "束", 2],
				["ツナ", "缶", 3],
			]),
			conversionDefaults: {},
			expected: ["束", "缶", "個", "本", "パック"],
		},
		{
			title: "同じ数なら、新しく使った単位を先に",
			itemName: "",
			itemMemories: memories([
				["にら", "束", 1],
				["ツナ", "缶", 2],
			]),
			conversionDefaults: {},
			expected: ["缶", "束", "個", "本", "パック"],
		},
	])("$title", ({ itemName, itemMemories, conversionDefaults, expected }) => {
		expect(
			listShoppingUnitChips({ itemName, itemMemories, conversionDefaults }),
		).toEqual(expected);
	});

	it("重さ・体積のチップの文字は、その食材で最後に選んだ方（g か kg）", () => {
		expect(
			listShoppingUnitChips({
				itemName: "鶏もも肉",
				itemMemories: {},
				conversionDefaults: {},
				preferMeasureUnit: kgPreferred,
			}),
		).toEqual(["パック", "枚", "kg", "個", "本"]);
	});
});
