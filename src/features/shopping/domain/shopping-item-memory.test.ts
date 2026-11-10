import { describe, expect, it } from "vitest";
import {
	type ShoppingConversionDefault,
	type ShoppingConversionDefaults,
	toConversionDefaultKey,
	toConversionMemoryKey,
} from "./shopping-conversion-default";
import {
	listRememberedShoppingChoices,
	type ShoppingItemMemories,
	toShoppingItemMemory,
} from "./shopping-item-memory";

function conversion(
	unitLabel: string,
	perUnit: number,
	usedAt: number,
	name = "鶏もも肉",
): ShoppingConversionDefaults {
	const nameKey = toConversionDefaultKey(name) ?? "";
	const value: ShoppingConversionDefault = {
		unitLabel,
		inventoryConversion: {
			inputUnitCode: unitLabel,
			stockUnitCode: "g",
			stockUnitLabel: "g",
			stockQuantityPerInputUnit: perUnit,
			trackingMode: "estimated",
		},
	};

	return {
		[toConversionMemoryKey(nameKey, unitLabel)]: { ...value, nameKey, usedAt },
	};
}

function memory(
	quantity: number,
	unitLabel: string | null,
	name = "鶏もも肉",
): ShoppingItemMemories {
	const value = toShoppingItemMemory(
		{
			name,
			quantity,
			unitLabel,
			categoryId: "meat",
			categoryAssignment: "manual",
		},
		10,
	);

	return value ? { [value.nameKey]: value } : {};
}

describe("listRememberedShoppingChoices", () => {
	it.each([
		{
			title:
				"前回の買い方を先頭に、ほかの単位の換算の記憶を新しい順に、3つまで",
			name: "鶏もも肉",
			memories: memory(2, "パック"),
			conversions: {
				...conversion("パック", 300, 5),
				...conversion("枚", 250, 1),
				...conversion("袋", 500, 4),
				...conversion("kg", 1000, 3),
			},
			expected: ["2パック（600g）", "1袋（500g）", "1kg（1,000g）"],
		},
		{
			title: "前回の買い方がなければ、換算の記憶だけ（数量は1）",
			name: "鶏もも肉",
			memories: {},
			conversions: {
				...conversion("パック", 300, 1),
				...conversion("袋", 500, 2),
			},
			expected: ["1袋（500g）", "1パック（300g）"],
		},
		{
			title:
				"前回の単位に換算の記憶がなければ、食材と単位から推定する（買う単位と在庫の単位が同じなら、換算は書かない）",
			name: "卵",
			memories: memory(6, "個", "卵"),
			conversions: {},
			expected: ["6個"],
		},
		{
			title: "ほかの食材の前回の買い方は、使わない",
			name: "鶏もも肉",
			memories: memory(1, "本", "牛乳"),
			conversions: conversion("パック", 300, 1),
			expected: ["1パック（300g）"],
		},
	])("$title", ({ name, memories, conversions, expected }) => {
		expect(
			listRememberedShoppingChoices(name, memories, conversions).map(
				(choice) => choice.label,
			),
		).toEqual(expected);
	});

	it("名前が空なら、候補はない", () => {
		expect(listRememberedShoppingChoices(" ", memory(2, "パック"), {})).toEqual(
			[],
		);
	});
});
