import { describe, expect, it } from "vitest";
import { formatRecipeIngredientQuantity } from "./format-recipe-storage-number";

describe("formatRecipeIngredientQuantity", () => {
	it("分数量を小数点以下6桁へ丸める", () => {
		expect(formatRecipeIngredientQuantity(1 / 3)).toBe("0.333333");
	});

	it("丸めるとゼロになる数量を拒否する", () => {
		expect(() => formatRecipeIngredientQuantity(0.0000001)).toThrow(
			"小さすぎます",
		);
	});

	it("列へ保存できない大きな数量を拒否する", () => {
		expect(() => formatRecipeIngredientQuantity(1_000_000_000)).toThrow();
	});
});
