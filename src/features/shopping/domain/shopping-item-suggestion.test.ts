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

	it("英字の大文字小文字に関係なく牛乳の候補を返す", () => {
		expect(getShoppingItemPresets("mILK")).toEqual([
			{ quantity: 1, unitLabel: "本" },
			{ quantity: 1, unitLabel: "L" },
			{ quantity: 200, unitLabel: "ml" },
		]);
	});

	it("未知の商品には候補を返さない", () => {
		expect(getShoppingItemPresets("謎の商品")).toEqual([]);
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

	it.each([
		"牛乳",
		"ぎゅうにゅう",
		"ミルク",
		"ギュウニュウ",
		"milk",
		"Milk",
		"MILK",
		"mILK",
		"MilK",
		"ＭｉＬＫ",
	])("%sを乳製品カテゴリに分類する", (itemName) => {
		expect(inferShoppingCategory(itemName)).toBe("dairy");
	});

	it("Unicode表現と前後の空白を正規化する", () => {
		expect(inferShoppingCategory("  タマゴ  ")).toBe("eggs");
	});

	it("未知の商品は分類しない", () => {
		expect(inferShoppingCategory("謎の商品")).toBeNull();
	});

	it("空の商品名は分類しない", () => {
		expect(inferShoppingCategory("　 ")).toBeNull();
	});
});
