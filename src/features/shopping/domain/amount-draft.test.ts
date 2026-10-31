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

	it("単位が決まっている食材は、その種類の単位だけ選べる", () => {
		expect(listUnitOptions(chicken).map((option) => option.value)).toEqual([
			"g",
		]);
		expect(
			listUnitOptions(
				buildShoppingItem({ name: "謎の商品", inventoryConversion: null }),
			).map((option) => option.value),
		).toContain("ml");
	});
});
