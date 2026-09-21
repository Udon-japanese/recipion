import { describe, expect, it } from "vitest";
import { getShoppingItemPresets } from "./shopping-item-preset";

describe("getShoppingItemPresets", () => {
	it.each([
		"卵",
		"たまご",
		"タマゴ",
		"玉子",
	])("%sには6個と10個の候補を返す", (itemName) => {
		expect(getShoppingItemPresets(itemName)).toEqual([
			{ quantity: 6, unitLabel: "個" },
			{ quantity: 10, unitLabel: "個" },
		]);
	});

	it("商品名の前後の空白を無視する", () => {
		expect(getShoppingItemPresets("  卵  ")).toHaveLength(2);
	});

	it("候補がない商品には空配列を返す", () => {
		expect(getShoppingItemPresets("牛乳")).toEqual([]);
	});
});
