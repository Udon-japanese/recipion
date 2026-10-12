import { describe, expect, it } from "vitest";
import type { InventoryLot } from "./inventory-lot";
import { planStockUnitChange } from "./plan-stock-unit-change";

function lot(
	id: string,
	quantity: number,
	expiresOn: string | null,
): InventoryLot {
	return {
		id,
		quantity,
		acquiredOn: "2026-10-01",
		storage: null,
		expiresOn,
		expiryKind: null,
		expirySource: null,
		createdAt: "2026-10-01T00:00:00.000Z",
	};
}

const lots = [lot("late", 600, "2026-10-20"), lot("early", 300, "2026-10-10")];

describe("planStockUnitChange", () => {
	it("換算できるとき、ロットごとに換算する（割り振りではない）", () => {
		const plan = planStockUnitChange({ lots, factor: 1 / 250 });

		expect(plan.lotQuantities).toEqual([
			{ lotId: "early", quantity: 1.2 },
			{ lotId: "late", quantity: 2.4 },
		]);
		expect(plan.adjustmentFromConversion).toBe(0);
	});

	it("入力が換算の合計と同じなら、そのまま", () => {
		const plan = planStockUnitChange({
			lots,
			factor: 1 / 250,
			currentQuantity: 3.6,
		});

		expect(plan.lotQuantities.map((l) => l.quantity)).toEqual([1.2, 2.4]);
		expect(plan.adjustmentFromConversion).toBe(0);
	});

	it("入力が少ないとき、期限が近いロットから減らす（均等に割らない）", () => {
		const plan = planStockUnitChange({
			lots,
			factor: 1 / 250,
			currentQuantity: 3,
		});

		// 3.6 → 3：差 -0.6 を、期限の近い方（1.2）から引く
		expect(plan.lotQuantities).toEqual([
			{ lotId: "early", quantity: 0.6 },
			{ lotId: "late", quantity: 2.4 },
		]);
		expect(plan.adjustmentFromConversion).toBe(-0.6);
	});

	it("入力が少なく、期限の近いロットを使い切っても足りないとき、次のロットから減らす", () => {
		const plan = planStockUnitChange({
			lots,
			factor: 1 / 250,
			currentQuantity: 2,
		});

		expect(plan.lotQuantities).toEqual([
			{ lotId: "early", quantity: 0 },
			{ lotId: "late", quantity: 2 },
		]);
	});

	it("入力が多いとき、期限が近いロットに足す", () => {
		const plan = planStockUnitChange({
			lots,
			factor: 1 / 250,
			currentQuantity: 4,
		});

		expect(plan.lotQuantities).toEqual([
			{ lotId: "early", quantity: 1.6 },
			{ lotId: "late", quantity: 2.4 },
		]);
		expect(plan.adjustmentFromConversion).toBe(0.4);
	});

	it("換算できないとき、入力された量を、期限が最も早いロットに寄せ、他は 0 にする。量がなければエラー", () => {
		const plan = planStockUnitChange({
			lots,
			factor: null,
			currentQuantity: 5,
		});

		expect(plan.lotQuantities).toEqual([
			{ lotId: "early", quantity: 5 },
			{ lotId: "late", quantity: 0 },
		]);
		expect(() => planStockUnitChange({ lots, factor: null })).toThrow(
			"いまの量を入力してください",
		);
	});

	it("ロットがなくても、量が入力されたら、新しいロットの数量にする", () => {
		expect(
			planStockUnitChange({ lots: [], factor: 1, currentQuantity: 2 }),
		).toMatchObject({ lotQuantities: [], newLotQuantity: 2 });
		expect(
			planStockUnitChange({ lots: [], factor: null, currentQuantity: 2 }),
		).toMatchObject({ newLotQuantity: 2 });
		expect(planStockUnitChange({ lots: [], factor: 1 }).newLotQuantity).toBe(0);
	});
});
