import { describe, expect, it } from "vitest";
import type { InventoryLot, InventoryLotPurchaseUnit } from "./inventory-lot";
import {
	convertLotUnitAmount,
	listLotAmountUnits,
	lotQuantityInUnit,
	lotsQuantityInUnit,
	planLotUnitDecrease,
	remainingLotsAfter,
} from "./lot-unit-decrease";

function lot(
	id: string,
	quantity: number,
	purchaseUnit: InventoryLotPurchaseUnit | null,
	expiresOn: string | null = null,
): InventoryLot {
	return {
		id,
		quantity,
		acquiredOn: "2026-11-01",
		storage: null,
		expiresOn,
		expiryKind: null,
		expirySource: null,
		purchaseUnit,
		createdAt: `2026-11-01T00:00:00.000Z-${id}`,
	};
}

const each110g = { label: "個", quantity: 110, quantityUnitLabel: "g" };
const each100g = { label: "個", quantity: 100, quantityUnitLabel: "g" };
const countStock = { stockUnitCode: "count", stockUnitLabel: "個" } as const;
const udon200g = { quantity: 200, unitLabel: "g" };

describe("planLotUnitDecrease", () => {
	it("切り上げ：200gを、1個＝110gのロットで、2個引く", () => {
		expect(
			planLotUnitDecrease({
				lots: [lot("a", 5, each110g)],
				amount: udon200g,
				stock: countStock,
				rounding: "up",
				fallbackRequired: 1,
			}),
		).toEqual({
			quantity: 2,
			required: 2,
			isShort: false,
			portions: [
				{ lotId: "a", purchaseUnit: each110g, quantity: 2, isRoundedUp: true },
			],
		});
	});

	it("ぴったり：200gを、1個＝110gのロットで、1.818182個引く", () => {
		const result = planLotUnitDecrease({
			lots: [lot("a", 5, each110g)],
			amount: udon200g,
			stock: countStock,
			rounding: "exact",
			fallbackRequired: 1,
		});

		expect(result?.quantity).toBe(1.818182);
		expect(result?.portions[0]?.isRoundedUp).toBe(false);
	});

	it("ちょうど割り切れるときは、切り上げにしない", () => {
		const result = planLotUnitDecrease({
			lots: [lot("a", 5, each110g)],
			amount: { quantity: 220, unitLabel: "g" },
			stock: countStock,
			rounding: "up",
			fallbackRequired: null,
		});

		expect(result?.quantity).toBe(2);
		expect(result?.portions[0]?.isRoundedUp).toBe(false);
	});

	it("kg も g に直して量る", () => {
		expect(
			planLotUnitDecrease({
				lots: [lot("a", 5, each100g)],
				amount: { quantity: 0.3, unitLabel: "kg" },
				stock: countStock,
				rounding: "up",
				fallbackRequired: null,
			})?.quantity,
		).toBe(3);
	});

	it("期限の早いロットから、それぞれの換算で引き、切り上げは最後のロットだけ", () => {
		// 早い方（100g）を1個使い切り、残り100gを、110gのロットから0.909個 → 切り上げて1個。
		const result = planLotUnitDecrease({
			lots: [
				lot("late", 3, each110g, "2026-11-20"),
				lot("early", 1, each100g, "2026-11-12"),
			],
			amount: udon200g,
			stock: countStock,
			rounding: "up",
			fallbackRequired: null,
		});

		expect(result).toEqual({
			quantity: 2,
			required: 2,
			isShort: false,
			portions: [
				{
					lotId: "early",
					purchaseUnit: each100g,
					quantity: 1,
					isRoundedUp: false,
				},
				{
					lotId: "late",
					purchaseUnit: each110g,
					quantity: 1,
					isRoundedUp: true,
				},
			],
		});
	});

	it("換算のないロットは、カタログの換算（fallbackRequired）で量る", () => {
		// 換算のあるロット（110g）を1個使い、残り90gは、1玉＝200g の換算で 0.45 個。
		const result = planLotUnitDecrease({
			lots: [
				lot("plain", 3, null, "2026-11-20"),
				lot("conv", 1, each110g, "2026-11-12"),
			],
			amount: udon200g,
			stock: countStock,
			rounding: "up",
			fallbackRequired: 1,
		});

		expect(result?.quantity).toBe(1.45);
		expect(result?.portions).toEqual([
			{
				lotId: "conv",
				purchaseUnit: each110g,
				quantity: 1,
				isRoundedUp: false,
			},
		]);
	});

	it("足りないときは、ある分だけで、全部の量も返す", () => {
		const result = planLotUnitDecrease({
			lots: [lot("a", 1, each110g)],
			amount: udon200g,
			stock: countStock,
			rounding: "up",
			fallbackRequired: null,
		});

		expect(result).toMatchObject({
			quantity: 1,
			required: 1.818182,
			isShort: true,
		});
	});

	it("切り上げても、ロットの残りは超えない", () => {
		const result = planLotUnitDecrease({
			lots: [lot("a", 1.5, each110g)],
			amount: { quantity: 120, unitLabel: "g" },
			stock: countStock,
			rounding: "up",
			fallbackRequired: null,
		});

		expect(result?.quantity).toBe(1.5);
		expect(result?.isShort).toBe(false);
	});

	it("在庫が g で、換算が 1玉＝200g なら、玉の量を g にする（切り上げない）", () => {
		const perBall = { label: "玉", quantity: 200, quantityUnitLabel: "g" };

		expect(
			planLotUnitDecrease({
				lots: [lot("a", 1000, perBall)],
				amount: { quantity: 1.5, unitLabel: "玉" },
				stock: { stockUnitCode: "g", stockUnitLabel: "g" },
				rounding: "up",
				fallbackRequired: null,
			})?.quantity,
		).toBe(300);
	});

	it("在庫が個で、換算が 1パック＝5個 なら、パックの量を個にする", () => {
		const perPack = { label: "パック", quantity: 5, quantityUnitLabel: "個" };

		expect(
			planLotUnitDecrease({
				lots: [lot("a", 10, perPack)],
				amount: { quantity: 1, unitLabel: "パック" },
				stock: countStock,
				rounding: "up",
				fallbackRequired: null,
			})?.quantity,
		).toBe(5);
	});

	it("言い換え（1枚(250g)の250g）でも量る", () => {
		const perSheet = { label: "枚", quantity: 125, quantityUnitLabel: "g" };

		expect(
			planLotUnitDecrease({
				lots: [lot("a", 4, perSheet)],
				amount: {
					quantity: 1,
					unitLabel: "枚",
					alternate: { quantity: 250, unitLabel: "g" },
				},
				stock: { stockUnitCode: "count", stockUnitLabel: "枚" },
				rounding: "up",
				fallbackRequired: 1,
			})?.quantity,
		).toBe(2);
	});

	it("量が換算の単位にならなければ、null（これまでどおりに引く）", () => {
		expect(
			planLotUnitDecrease({
				lots: [lot("a", 5, each110g)],
				amount: { quantity: 2, unitLabel: "個" },
				stock: countStock,
				rounding: "up",
				fallbackRequired: 2,
			}),
		).toBeNull();
	});

	it("換算のあるロットがなければ、null", () => {
		expect(
			planLotUnitDecrease({
				lots: [lot("a", 5, null)],
				amount: udon200g,
				stock: countStock,
				rounding: "up",
				fallbackRequired: 1,
			}),
		).toBeNull();
	});

	it("先に量れないロットがあれば、null（引く順が在庫の引き算と合わなくなるため）", () => {
		expect(
			planLotUnitDecrease({
				lots: [
					lot("plain", 1, null, "2026-11-12"),
					lot("conv", 3, each110g, "2026-11-20"),
				],
				amount: udon200g,
				stock: countStock,
				rounding: "up",
				fallbackRequired: null,
			}),
		).toBeNull();
	});
});

describe("remainingLotsAfter", () => {
	it("引いた量を、期限の早いロットから除く", () => {
		const early = lot("early", 1, each100g, "2026-11-12");
		const late = lot("late", 3, each110g, "2026-11-20");

		expect(remainingLotsAfter([late, early], 1.5)).toEqual([
			{ ...late, quantity: 2.5 },
		]);
	});
});

describe("listLotAmountUnits", () => {
	it("ロットの換算から、在庫の単位のほかに打てる単位を、重ねずに返す", () => {
		const perPack = { label: "パック", quantity: 5, quantityUnitLabel: "個" };

		expect(
			listLotAmountUnits(
				[
					lot("a", 2, each110g),
					lot("b", 1, each100g),
					lot("c", 5, perPack),
					lot("d", 3, null),
					lot("empty", 0, {
						label: "個",
						quantity: 1,
						quantityUnitLabel: "枚",
					}),
				],
				countStock,
			),
		).toEqual(["g", "パック"]);
	});
});

describe("convertLotUnitAmount", () => {
	it("打った g を、ロットごとの換算で個にする（端数はぴったり）", () => {
		expect(
			convertLotUnitAmount(
				[lot("early", 1, each100g, "2026-11-12"), lot("late", 3, each110g)],
				{ quantity: 210, unitLabel: "g" },
				countStock,
			),
		).toBe(2);
	});

	it("在庫より多い量も、そのまま返す", () => {
		expect(
			convertLotUnitAmount(
				[lot("a", 1, each110g)],
				{ quantity: 220, unitLabel: "g" },
				countStock,
			),
		).toBe(2);
	});

	it("量れなければ null", () => {
		expect(
			convertLotUnitAmount(
				[lot("a", 1, null)],
				{ quantity: 220, unitLabel: "g" },
				countStock,
			),
		).toBeNull();
	});
});

describe("lotQuantityInUnit・lotsQuantityInUnit", () => {
	const perBall = { label: "玉", quantity: 200, quantityUnitLabel: "g" };
	const gramStock = { stockUnitCode: "g", stockUnitLabel: "g" } as const;

	it("在庫が個で 1個＝110g なら、3個を 330g で表す", () => {
		expect(lotQuantityInUnit(lot("a", 3, each110g), "g", countStock)).toBe(330);
	});

	it("在庫が g で 1玉＝200g なら、600g を 3玉で表す", () => {
		expect(lotQuantityInUnit(lot("a", 600, perBall), "玉", gramStock)).toBe(3);
	});

	it("換算のないロット・単位の違う換算は null", () => {
		expect(lotQuantityInUnit(lot("a", 3, null), "g", countStock)).toBeNull();
		expect(
			lotQuantityInUnit(lot("a", 3, each110g), "ml", countStock),
		).toBeNull();
	});

	it("合計は、全部のロットを直せるときだけ（0のロットは数えない）", () => {
		expect(
			lotsQuantityInUnit(
				[lot("a", 3, each110g), lot("b", 1, each100g), lot("c", 0, null)],
				"g",
				countStock,
			),
		).toBe(430);
		expect(
			lotsQuantityInUnit(
				[lot("a", 3, each110g), lot("b", 1, null)],
				"g",
				countStock,
			),
		).toBeNull();
	});
});
