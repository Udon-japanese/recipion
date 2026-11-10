import { describe, expect, it } from "vitest";
import {
	collectPurchaseUnitCandidates,
	emptyPurchaseUnitDraft,
	parsePurchaseUnitDraft,
	toPurchaseUnitDraft,
} from "./purchase-unit-draft";

const udon200 = { label: "個", quantity: 200, quantityUnitLabel: "g" };
const udon110 = { label: "個", quantity: 110, quantityUnitLabel: "g" };

describe("parsePurchaseUnitDraft", () => {
	it("量が空なら、換算なし。入っていれば、呼び名・量・単位の換算にする", () => {
		expect(parsePurchaseUnitDraft(emptyPurchaseUnitDraft("個"))).toBeNull();
		expect(
			parsePurchaseUnitDraft({
				label: " 個 ",
				quantityText: "110",
				quantityUnitLabel: "g",
			}),
		).toEqual(udon110);
		expect(
			parsePurchaseUnitDraft({
				label: "パック",
				quantityText: "1/2",
				quantityUnitLabel: "個",
			})?.quantity,
		).toBe(0.5);
	});

	it("読めない量・0以下・呼び名が空は、理由つきでエラーにする", () => {
		for (const quantityText of ["abc", "0", "-5"]) {
			expect(() =>
				parsePurchaseUnitDraft({
					label: "個",
					quantityText,
					quantityUnitLabel: "g",
				}),
			).toThrow("1つあたりの量を確認してください");
		}

		expect(() =>
			parsePurchaseUnitDraft({
				label: " ",
				quantityText: "200",
				quantityUnitLabel: "g",
			}),
		).toThrow("買った単位を入力してください");
	});
});

describe("toPurchaseUnitDraft", () => {
	it("換算を入力欄の文字に戻す。なければ、呼び名だけ入った空の欄", () => {
		expect(toPurchaseUnitDraft(udon200, "玉")).toEqual({
			label: "個",
			quantityText: "200",
			quantityUnitLabel: "g",
		});
		expect(toPurchaseUnitDraft(null, "玉")).toEqual(
			emptyPurchaseUnitDraft("玉"),
		);
	});
});

describe("collectPurchaseUnitCandidates", () => {
	it("先の並びを優先して、同じ換算は1つにまとめ、最大3つにする", () => {
		expect(
			collectPurchaseUnitCandidates([udon110, null, udon200, udon110]),
		).toEqual([udon110, udon200]);
		expect(
			collectPurchaseUnitCandidates([
				udon110,
				udon200,
				{ label: "袋", quantity: 300, quantityUnitLabel: "g" },
				{ label: "袋", quantity: 500, quantityUnitLabel: "g" },
			]),
		).toHaveLength(3);
	});
});
