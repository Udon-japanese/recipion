import { describe, expect, it } from "vitest";
import { listStockUnitOptions } from "./list-stock-unit-options";

function labels(name: string) {
	return listStockUnitOptions(name).map(
		(option) => `${option.stockUnitCode}:${option.stockUnitLabel}`,
	);
}

describe("listStockUnitOptions（マスタにある単位だけを出す）", () => {
	it.each([
		// 標準の単位が g で、重さの定義は「枚」だけ：個や ml は出さない
		["鶏もも肉", ["g:g", "count:枚"]],
		["鶏むね肉", ["g:g", "count:枚"]],
		["大根", ["g:g", "count:本"]],
		["キャベツ", ["g:g", "count:枚", "count:玉"]],
		// 標準の単位が個数：その呼び名（個）と、重さの定義のある数え方
		["玉ねぎ", ["g:g", "count:個"]],
		// 標準の単位が ml で密度がある
		["牛乳", ["g:g", "ml:ml"]],
		// マスタにない食材は、g・ml・個
		["謎の食材", ["g:g", "ml:ml", "count:個"]],
	])("%s", (name, expected) => {
		expect(labels(name)).toEqual(expected);
	});

	it("マスタにない単位を出さない：鶏もも肉に ml と個はない", () => {
		expect(labels("鶏もも肉")).not.toContain("ml:ml");
		expect(labels("鶏もも肉")).not.toContain("count:個");
	});

	it("重複しない", () => {
		for (const name of ["鶏もも肉", "卵", "醤油", "キャベツ", "謎の食材"]) {
			expect(new Set(labels(name)).size).toBe(labels(name).length);
		}
	});
});
