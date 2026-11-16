import { describe, expect, it } from "vitest";
import {
	collectPurchaseUnitCandidates,
	emptyPurchaseUnitDraft,
	parsePurchaseUnitDraft,
	summarizePurchaseUnitDraft,
	toPurchaseUnitDraft,
} from "./purchase-unit-draft";

const udon200 = { label: "個", quantity: 200, quantityUnitLabel: "g" };
const udon110 = { label: "個", quantity: 110, quantityUnitLabel: "g" };

describe("summarizePurchaseUnitDraft", () => {
	// 換算を残さない入力は、「未設定」ではなく、在庫の単位のまま（保存されるのと同じ判定）。
	it.each([
		["量が空", emptyPurchaseUnitDraft("個"), "個", "個のまま"],
		[
			"同じ単位（1枚＝1枚）",
			{ label: "枚", quantityText: "1", quantityUnitLabel: "枚" },
			"枚",
			"枚のまま",
		],
		[
			"g そのもの（1g＝1g）",
			{ label: "g", quantityText: "1", quantityUnitLabel: "g" },
			"g",
			"gのまま",
		],
		[
			"換算があれば、その表示",
			{ label: "玉", quantityText: "40", quantityUnitLabel: "g" },
			"g",
			"1玉＝40g",
		],
	])("%s は、%s", (_title, draft, stockUnitLabel, expected) => {
		expect(summarizePurchaseUnitDraft(draft, stockUnitLabel)).toBe(expected);
	});
});

describe("parsePurchaseUnitDraft", () => {
	it("量が空なら、換算なし。入っていれば、呼び名・量・単位の換算にする", () => {
		expect(
			parsePurchaseUnitDraft(emptyPurchaseUnitDraft("個"), "個"),
		).toBeNull();
		expect(
			parsePurchaseUnitDraft(
				{
					label: " 個 ",
					quantityText: "110",
					quantityUnitLabel: "g",
				},
				"個",
			),
		).toEqual(udon110);
		expect(
			parsePurchaseUnitDraft(
				{
					label: "パック",
					quantityText: "1/2",
					quantityUnitLabel: "個",
				},
				"個",
			)?.quantity,
		).toBe(0.5);
	});

	it.each([
		["1.5", "kg", 1500, "g"],
		["0.5", "L", 500, "ml"],
	])(
		"%s%s で打った量は、%s%s で持つ",
		(quantityText, unit, quantity, unitLabel) => {
			expect(
				parsePurchaseUnitDraft(
					{
						label: "袋",
						quantityText,
						quantityUnitLabel: unit,
					},
					"個",
				),
			).toEqual({ label: "袋", quantity, quantityUnitLabel: unitLabel });
		},
	);

	it("読めない量・0以下・呼び名が空は、理由つきでエラーにする", () => {
		for (const quantityText of ["abc", "0", "-5"]) {
			expect(() =>
				parsePurchaseUnitDraft(
					{
						label: "個",
						quantityText,
						quantityUnitLabel: "g",
					},
					"個",
				),
			).toThrow("1つあたりの量を確認してください");
		}

		expect(() =>
			parsePurchaseUnitDraft(
				{
					label: " ",
					quantityText: "200",
					quantityUnitLabel: "g",
				},
				"個",
			),
		).toThrow("買った単位を入力してください");
	});
});

describe("parsePurchaseUnitDraft（在庫の量に直せるか）", () => {
	// 左が在庫の単位なら、右は何でもよい（枚で打った量を、袋に直して引く）。右が在庫の単位か g・ml でもよい。
	it.each([
		{ stock: "袋", label: "袋", unit: "枚", fits: true },
		{ stock: "枚", label: "袋", unit: "枚", fits: true },
		{ stock: "g", label: "パック", unit: "g", fits: true },
		{ stock: "個", label: "個", unit: "g", fits: true },
		{ stock: "g", label: "袋", unit: "枚", fits: false },
		{ stock: "個", label: "袋", unit: "枚", fits: false },
	])(
		"在庫が「$stock」で「1 $label ＝ 6 $unit」は、使える：$fits",
		({ stock, label, unit, fits }) => {
			const parse = () =>
				parsePurchaseUnitDraft(
					{ label, quantityText: "6", quantityUnitLabel: unit },
					stock,
				);

			if (fits) {
				expect(parse()).toEqual({
					label,
					quantity: 6,
					quantityUnitLabel: unit,
				});
			} else {
				expect(parse).toThrow(`在庫は${stock}で数えるので`);
			}
		},
	);

	it("1つあたりの単位（その他）が空なら、理由つきでエラーにする", () => {
		expect(() =>
			parsePurchaseUnitDraft(
				{ label: "袋", quantityText: "6", quantityUnitLabel: " " },
				"袋",
			),
		).toThrow("1つあたりの単位を入力してください");
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
