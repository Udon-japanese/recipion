import { describe, expect, it } from "vitest";
import {
	formatRecipeIngredientQuantity,
	formatRecipeServings,
} from "./format-recipe-storage-number";

describe("formatRecipeServings", () => {
	it("基準人数を小数点以下3桁で保存する", () => {
		expect(formatRecipeServings(2)).toBe("2.000");
		expect(formatRecipeServings(1.5)).toBe("1.500");
	});

	it.each([
		0,
		-1,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		10_000_000,
	])("保存できない値を拒否する: %s", (value) => {
		expect(() => formatRecipeServings(value)).toThrow();
	});

	it("丸めるとゼロになる人数を拒否する", () => {
		expect(() => formatRecipeServings(0.0001)).toThrow("小さすぎます");
	});
});

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
