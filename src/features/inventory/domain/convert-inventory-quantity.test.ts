import { describe, expect, it } from "vitest";
import { convertInventoryQuantity } from "./convert-inventory-quantity";

describe("convertInventoryQuantity", () => {
	it("卵1パックを6個へ換算する", () => {
		expect(
			convertInventoryQuantity({
				inputQuantity: 1,
				inputUnitCode: "pack",
				stockUnitCode: "piece",
				stockQuantityPerInputUnit: 6,
			}),
		).toEqual({
			quantity: 6,
			unitCode: "piece",
		});
	});

	it.each([
		[150, 2, 300],
		[200, 2, 400],
	])("1袋%sグラムの商品を%s袋買うと%sグラムになる", (stockQuantityPerInputUnit, inputQuantity, expectedQuantity) => {
		expect(
			convertInventoryQuantity({
				inputQuantity,
				inputUnitCode: "bag",
				stockUnitCode: "g",
				stockQuantityPerInputUnit,
			}),
		).toEqual({
			quantity: expectedQuantity,
			unitCode: "g",
		});
	});

	it("同じ単位は内容量1で換算できる", () => {
		expect(
			convertInventoryQuantity({
				inputQuantity: 250,
				inputUnitCode: "ml",
				stockUnitCode: "ml",
				stockQuantityPerInputUnit: 1,
			}),
		).toEqual({
			quantity: 250,
			unitCode: "ml",
		});
	});

	it("小数点以下6桁へ丸める", () => {
		expect(
			convertInventoryQuantity({
				inputQuantity: 1,
				inputUnitCode: "portion",
				stockUnitCode: "g",
				stockQuantityPerInputUnit: 1 / 3,
			}),
		).toEqual({
			quantity: 0.333333,
			unitCode: "g",
		});
	});

	it.each([
		["入力数量が0", 0, 1],
		["入力数量が負数", -1, 1],
		["1包装あたりの数量が0", 1, 0],
		["1包装あたりの数量が負数", 1, -1],
	])("%sなら拒否する", (_, inputQuantity, stockQuantityPerInputUnit) => {
		expect(() =>
			convertInventoryQuantity({
				inputQuantity,
				inputUnitCode: "pack",
				stockUnitCode: "piece",
				stockQuantityPerInputUnit,
			}),
		).toThrow();
	});
});
