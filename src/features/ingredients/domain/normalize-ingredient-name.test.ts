import { describe, expect, it } from "vitest";
import { normalizeIngredientName } from "./normalize-ingredient-name";

describe("normalizeIngredientName", () => {
	it("前後の空白を除去する", () => {
		expect(normalizeIngredientName("  卵  ")).toBe("卵");
	});

	it("連続する空白を一つにまとめる", () => {
		expect(normalizeIngredientName("ホットケーキ   ミックス")).toBe(
			"ホットケーキ ミックス",
		);
	});

	it("全角英数字と記号を半角へ正規化する", () => {
		expect(normalizeIngredientName("ＭＩＸ２００ｇ")).toBe("mix200g");
	});

	it("英字を小文字へ正規化する", () => {
		expect(normalizeIngredientName("Pancake MIX")).toBe("pancake mix");
	});

	it("全角スペースも通常の空白として扱う", () => {
		expect(normalizeIngredientName("ホットケーキ　ミックス")).toBe(
			"ホットケーキ ミックス",
		);
	});

	it("空白だけの名前を拒否する", () => {
		expect(() => normalizeIngredientName("　 ")).toThrow(
			"食材名を入力してください",
		);
	});
});
