import { describe, expect, it } from "vitest";
import { buildShoppingItem } from "#/test/builders/build-shopping-item";
import { describePurchaseResult } from "./describe-purchase-row";

const conversion = {
	inputUnitCode: "pack",
	stockUnitCode: "g" as const,
	stockUnitLabel: "g",
	stockQuantityPerInputUnit: 150,
	trackingMode: "estimated" as const,
};

describe("describePurchaseResult", () => {
	it("買った数と換算から、在庫に入る量の式を作る", () => {
		expect(
			describePurchaseResult(
				buildShoppingItem({
					quantity: 3,
					unitLabel: "パック",
					inventoryConversion: conversion,
				}),
			),
		).toBe("3パック × 150g ＝ 450g");
	});

	it("量を数えない商品と、換算がない商品は、式を出さない", () => {
		expect(
			describePurchaseResult(
				buildShoppingItem({
					inventoryConversion: { ...conversion, trackingMode: "presence" },
				}),
			),
		).toBeNull();
		expect(
			describePurchaseResult(buildShoppingItem({ inventoryConversion: null })),
		).toBeNull();
	});
});
