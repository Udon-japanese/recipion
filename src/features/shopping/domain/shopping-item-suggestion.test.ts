import { describe, expect, it } from "vitest";
import {
	getShoppingItemPresets,
	inferShoppingCategory,
} from "./shopping-item-suggestion";

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
});

describe("inferShoppingCategory", () => {
	it.each([
		"卵",
		"たまご",
		"タマゴ",
		"玉子",
	])("%sを卵カテゴリに分類する", (itemName) => {
		expect(inferShoppingCategory(itemName)).toBe("eggs");
	});

	it("Unicode表現と前後の空白を正規化する", () => {
		expect(inferShoppingCategory("  タマゴ  ")).toBe("eggs");
	});

	it("未知の商品は分類しない", () => {
		expect(inferShoppingCategory("謎の商品")).toBeNull();
	});
});
