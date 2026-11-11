import { describe, expect, it } from "vitest";
import {
	largerMeasureUnit,
	toBaseMeasureAmount,
	toggleMeasureUnit,
	withLargerMeasureUnits,
} from "./measure-units";

describe("toggleMeasureUnit・largerMeasureUnit（対になる単位）", () => {
	it.each([
		// 単位, 押したときの次, 表示で大きい量に使う単位
		["g", "kg", "kg"],
		["kg", "g", undefined],
		["KG", "g", undefined],
		["ml", "L", "L"],
		["mL", "L", "L"],
		["L", "ml", undefined],
		["l", "ml", undefined],
		// cc は ml と同じ量。押すと L、表示も L
		["cc", "L", "L"],
		// ほかの単位は、対がない
		["個", null, undefined],
		["", null, undefined],
	])("%s", (unit, toggled, larger) => {
		expect(toggleMeasureUnit(unit)).toBe(toggled);
		expect(largerMeasureUnit(unit)).toBe(larger);
	});
});

describe("toBaseMeasureAmount（kg・L で打った量を、g・ml にする）", () => {
	it.each([
		[1.5, "kg", 1500, "g"],
		// 掛け算の誤差（1100.0000000000002）を出さない
		[1.1, "kg", 1100, "g"],
		[0.25, "L", 250, "ml"],
		// 基本の単位・ほかの単位は、そのまま
		[300, "g", 300, "g"],
		[200, "cc", 200, "cc"],
		[2, "個", 2, "個"],
	])("%s%s → %s%s", (quantity, unitLabel, expectedQuantity, expectedUnit) => {
		expect(toBaseMeasureAmount({ quantity, unitLabel })).toEqual({
			quantity: expectedQuantity,
			unitLabel: expectedUnit,
		});
	});
});

describe("withLargerMeasureUnits（候補に kg・L を足す）", () => {
	it.each([
		[
			["g", "ml"],
			["g", "kg", "ml", "L"],
		],
		[
			["g", "ml", "個"],
			["g", "kg", "ml", "L", "個"],
		],
		// すでにあれば、重ねない
		[
			["g", "kg"],
			["g", "kg"],
		],
		[["個"], ["個"]],
		// 在庫の単位が g の食材のロット（g・ml・在庫の単位）でも、g を2つ出さない
		[
			["g", "ml", "g"],
			["g", "kg", "ml", "L"],
		],
	])("%j", (units, expected) => {
		expect(withLargerMeasureUnits(units)).toEqual(expected);
	});
});
