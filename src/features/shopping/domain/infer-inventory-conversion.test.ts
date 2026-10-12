import { describe, expect, it } from "vitest";
import { inferInventoryConversion } from "./infer-inventory-conversion";

// [食材名, 単位, 期待する換算（入力単位のコード, 在庫の単位, 1単位あたりの在庫数量）、または null]
const cases: [string, string | null, [string, string, number] | null][] = [
	// 数量プリセットと単位が一致する
	["玉ねぎ", "袋", ["bag", "count", 3]],
	["じゃがいも", "袋", ["bag", "count", 4]],
	["ブルーベリー", "パック", ["pack", "g", 100]],
	// 単位なし：在庫が個数なら 1個ずつ、そうでなければ決めない
	["玉ねぎ", null, ["count", "count", 1]],
	["小麦粉", null, null],
	// 単位が在庫の単位と同じ
	["玉ねぎ", "個", ["count", "count", 1]],
	["醤油", "ml", ["ml", "ml", 1]],
	// カタログの重さ・体積で換算できる
	["醤油", "l", ["l", "ml", 1000]],
	["玉ねぎ", "g", ["g", "count", 0.005]],
	["りんご", "個", ["count", "count", 1]],
	["いちご", "粒", ["粒", "g", 15]],
	// 決められない：中身の数が分からない単位、同じ単位で中身が違うプリセットが複数ある（150g袋と200g袋）、カタログにない食材
	["ホケミ", "袋", null],
	["玉ねぎ", "パック", null],
	["謎の食材", "個", null],
	["謎の食材", null, null],
];

describe("inferInventoryConversion", () => {
	it.each(cases)("%s（%s）", (name, unit, expected) => {
		const conversion = inferInventoryConversion(name, unit);

		if (expected === null) {
			expect(conversion).toBeNull();

			return;
		}

		expect(conversion).toMatchObject({
			inputUnitCode: expected[0],
			stockUnitCode: expected[1],
			stockQuantityPerInputUnit: expected[2],
		});
	});

	it("管理方法は、食材の初期値に従う", () => {
		expect(inferInventoryConversion("卵", "個")?.trackingMode).toBe("exact");
		expect(inferInventoryConversion("玉ねぎ", "個")?.trackingMode).toBe(
			"estimated",
		);
	});
});
