import { describe, expect, it } from "vitest";
import { listStockUnitOptions } from "./list-stock-unit-options";

function labels(name: string) {
	return listStockUnitOptions(name).map(
		(option) => `${option.stockUnitCode}:${option.stockUnitLabel}`,
	);
}

describe("listStockUnitOptions", () => {
	it.each([
		// 重さの定義がある食材は、その数え方が候補に出る。密度がなければ ml は出ない
		["鶏もも肉", ["g:g", "count:枚", "count:個"]],
		["大根", ["g:g", "count:本", "count:個"]],
		["キャベツ", ["g:g", "count:枚", "count:玉", "count:個"]],
		// 密度のある食材は ml も
		["牛乳", ["g:g", "ml:ml", "count:個"]],
		// カタログにない食材
		["謎の食材", ["g:g", "ml:ml", "count:個"]],
	])("%s", (name, expected) => {
		expect(labels(name)).toEqual(expect.arrayContaining(expected));
		expect(new Set(labels(name)).size).toBe(labels(name).length);
	});

	it("密度がない食材には ml を出さない", () => {
		expect(labels("鶏もも肉")).not.toContain("ml:ml");
	});
});
