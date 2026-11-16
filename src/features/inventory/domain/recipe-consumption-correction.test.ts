import { describe, expect, it } from "vitest";
import type { InventoryLot } from "./inventory-lot";
import {
	planRecipeConsumptionCorrection,
	sumConsumedByLot,
} from "./recipe-consumption-correction";

function lot(
	id: string,
	quantity: number,
	expiresOn: string | null,
): InventoryLot {
	return {
		id,
		quantity,
		acquiredOn: "2026-11-01",
		storage: null,
		expiresOn,
		expiryKind: expiresOn ? "best-before" : null,
		expirySource: null,
		purchaseUnit: null,
		createdAt: "2026-11-01T00:00:00.000Z",
	};
}

describe("sumConsumedByLot", () => {
	it("引いた分（マイナス）と、直して戻した分（プラス）を、ロットごとに合計する", () => {
		const consumed = sumConsumedByLot([
			{ inventoryLotId: "early", quantityDelta: -2 },
			{ inventoryLotId: "late", quantityDelta: -1 },
			{ inventoryLotId: "late", quantityDelta: 1 },
			{ inventoryLotId: "early", quantityDelta: 0.5 },
			{ inventoryLotId: null, quantityDelta: -1 },
		]);

		expect(consumed.total).toBe(2.5);
		// 戻しきったロット（late）は含めない。消えたロット（null）は total にだけ入る。
		expect([...consumed.byLot]).toEqual([["early", 1.5]]);
	});
});

describe("planRecipeConsumptionCorrection", () => {
	// 引く前：early 2個・late 3個。「作った」で2個（early から2個）引いたあと。
	const afterCooking = {
		consumed: sumConsumedByLot([
			{ inventoryLotId: "early", quantityDelta: -2 },
		]),
		lots: [lot("late", 3, "2026-11-20"), lot("early", 0, "2026-11-10")],
	};

	it.each([
		{
			title: "増やすときは、いまの在庫から、期限の早いロットの順に引く",
			target: 4,
			expected: {
				kind: "take",
				allocations: [{ lotId: "late", quantity: 2 }],
			},
		},
		{
			title: "減らすときは、引いたロットへ戻す（新しいロットは作らない）",
			target: 0.5,
			expected: {
				kind: "return",
				allocations: [{ lotId: "early", quantity: 1.5 }],
			},
		},
		{
			title: "同じ量なら、何もしない（再送しても、二重に直らない）",
			target: 2,
			expected: { kind: "none" },
		},
	])("$title", ({ target, expected }) => {
		expect(
			planRecipeConsumptionCorrection({ ...afterCooking, target }),
		).toEqual(expected);
	});

	it("減らすときは、引いた順の逆（期限の遅いロット）から戻す", () => {
		expect(
			planRecipeConsumptionCorrection({
				consumed: sumConsumedByLot([
					{ inventoryLotId: "early", quantityDelta: -2 },
					{ inventoryLotId: "late", quantityDelta: -1 },
				]),
				lots: [lot("early", 0, "2026-11-10"), lot("late", 2, "2026-11-20")],
				target: 1,
			}),
		).toEqual({
			kind: "return",
			allocations: [
				{ lotId: "late", quantity: 1 },
				{ lotId: "early", quantity: 1 },
			],
		});
	});

	it("在庫を超える量には、直せない", () => {
		expect(() =>
			planRecipeConsumptionCorrection({ ...afterCooking, target: 6 }),
		).toThrow("在庫が足りないため");
	});

	it("引いたロットが消えていて戻しきれないなら、直せない", () => {
		expect(() =>
			planRecipeConsumptionCorrection({
				consumed: sumConsumedByLot([
					{ inventoryLotId: null, quantityDelta: -2 },
				]),
				lots: [lot("late", 3, "2026-11-20")],
				target: 1,
			}),
		).toThrow("引いたときの在庫が消えている");
	});
});
