import { describe, expect, it } from "vitest";
import { buildShoppingItem } from "#/test/builders/build-shopping-item";
import {
	buildAmountConfiguration,
	describeAmountTotal,
	initialAmountDraft,
	listUnitOptions,
	otherUnitValue,
} from "./amount-draft";

const chicken = buildShoppingItem({
	name: "鶏もも肉",
	quantity: 2,
	unitLabel: "パック",
	inventoryConversion: null,
});

describe("initialAmountDraft", () => {
	it("個数の食材は、「1」と買った単位から始め、g・ml の食材は、数を空にする", () => {
		expect(
			initialAmountDraft(
				buildShoppingItem({
					name: "はなげ",
					unitLabel: "袋",
					inventoryConversion: null,
				}),
			),
		).toMatchObject({ quantityText: "1", unit: "袋" });
		expect(
			initialAmountDraft(
				buildShoppingItem({
					name: "はなげ",
					unitLabel: "束",
					inventoryConversion: null,
				}),
			),
		).toMatchObject({ unit: otherUnitValue, customUnit: "束" });
		expect(initialAmountDraft(chicken)).toMatchObject({
			quantityText: "",
			unit: "g",
		});
		// 最後に kg を選んだ食材は、kg から始める（端末の記憶を、呼び出し側が渡す）。
		expect(
			initialAmountDraft(chicken, (unit) => (unit === "g" ? "kg" : unit)),
		).toMatchObject({ unit: "kg" });
	});
});

describe("buildAmountConfiguration", () => {
	it("数と単位を、保存する換算にする", () => {
		expect(
			buildAmountConfiguration(chicken, {
				quantityText: "300",
				unit: "g",
				customUnit: "",
				isPresence: false,
			}).inventoryConversion,
		).toMatchObject({
			stockUnitCode: "g",
			stockUnitLabel: "g",
			stockQuantityPerInputUnit: 300,
			inputUnitCode: "パック",
		});
		expect(
			buildAmountConfiguration(
				buildShoppingItem({
					name: "はなげ",
					unitLabel: "袋",
					inventoryConversion: null,
				}),
				{
					quantityText: "1/2",
					unit: otherUnitValue,
					customUnit: "玉",
					isPresence: false,
				},
			).inventoryConversion,
		).toMatchObject({
			stockUnitCode: "count",
			stockUnitLabel: "玉",
			stockQuantityPerInputUnit: 0.5,
		});
	});

	// kg・L・cc で打った量は、在庫の単位（g・ml）で保存する。数の誤差は出さない。
	it.each([
		["1.5", "kg", "g", 1500],
		["1.1", "kg", "g", 1100],
		["0.5", "L", "ml", 500],
		["300", "g", "g", 300],
		["200", "cc", "ml", 200],
	])("%s%s は、%s で %s", (quantityText, unit, stockUnitLabel, quantity) => {
		const isOther = unit === "cc";

		expect(
			buildAmountConfiguration(chicken, {
				quantityText,
				unit: isOther ? otherUnitValue : unit,
				customUnit: isOther ? unit : "",
				isPresence: false,
			}).inventoryConversion,
		).toMatchObject({
			stockUnitCode: stockUnitLabel,
			stockUnitLabel,
			stockQuantityPerInputUnit: quantity,
		});
	});

	it("数が読めない・0以下・「その他」の単位が空なら、理由つきで throw する", () => {
		const base = {
			quantityText: "",
			unit: "g",
			customUnit: "",
			isPresence: false,
		};

		expect(() => buildAmountConfiguration(chicken, base)).toThrow(
			"0より大きい数",
		);
		expect(() =>
			buildAmountConfiguration(chicken, { ...base, quantityText: "0" }),
		).toThrow("0より大きい数");
		expect(() =>
			buildAmountConfiguration(chicken, {
				...base,
				quantityText: "1",
				unit: otherUnitValue,
			}),
		).toThrow("単位を入れてください");
	});

	it("量を数えないときは、数を読まずに、有無だけの換算にする", () => {
		expect(
			buildAmountConfiguration(chicken, {
				quantityText: "",
				unit: "g",
				customUnit: "",
				isPresence: true,
			}).inventoryConversion.trackingMode,
		).toBe("presence");
	});
});

describe("describeAmountTotal / listUnitOptions", () => {
	it("読めたときだけ、買った数をかけた合計を出す", () => {
		const draft = {
			quantityText: "300",
			unit: "g",
			customUnit: "",
			isPresence: false,
		};

		expect(describeAmountTotal(chicken, draft)).toBe("600g");
		expect(
			describeAmountTotal(chicken, { ...draft, quantityText: "" }),
		).toBeNull();
	});

	it("g の食材は g・kg だけ選べ、個数の食材は g・kg・ml・L（1個が何gか）も選べる", () => {
		expect(listUnitOptions(chicken).map((option) => option.value)).toEqual([
			"g",
			"kg",
		]);
		expect(
			listUnitOptions(
				buildShoppingItem({ name: "冷凍うどん", inventoryConversion: null }),
			).map((option) => option.value),
		).toEqual([
			"g",
			"kg",
			"ml",
			"L",
			"個",
			"枚",
			"本",
			"袋",
			"パック",
			"other",
		]);
		expect(
			listUnitOptions(
				buildShoppingItem({ name: "謎の商品", inventoryConversion: null }),
			).map((option) => option.value),
		).toContain("ml");
	});
});
