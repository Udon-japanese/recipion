import { UserFacingError } from "#/errors/user-facing-error";
import {
	allocateDecrease,
	type InventoryLot,
	type InventoryLotAllocation,
	sortLotsForConsumption,
	sumLotQuantities,
} from "./inventory-lot";

// 「作った」の1回の操作（sourceId）で、ある食材から引いた履歴の1行（reason は recipe-consumption）。
// 引いた分はマイナス、あとで「直す」で戻した分はプラス。
export type RecipeConsumptionHistoryRow = {
	inventoryLotId: string | null;
	quantityDelta: number;
};

export type ConsumedByLot = {
	// この操作で、いま引いている量（在庫の単位。履歴の合計の符号を反転したもの）。
	total: number;
	// ロットごとの、いま引いている量（0 以下のロットは含めない）。消えたロット（null）は total にだけ入る。
	byLot: Map<string, number>;
};

const epsilon = 1e-9;

function round(value: number): number {
	return Number(value.toFixed(6));
}

/** 履歴から、この操作でいま引いている量を、ロットごとに合計する（「元に戻す」と「直す」の、ただ1つの数え方）。 */
export function sumConsumedByLot(
	rows: readonly RecipeConsumptionHistoryRow[],
): ConsumedByLot {
	const sums = new Map<string, number>();
	let total = 0;

	for (const row of rows) {
		total += -row.quantityDelta;

		if (row.inventoryLotId !== null) {
			sums.set(
				row.inventoryLotId,
				(sums.get(row.inventoryLotId) ?? 0) - row.quantityDelta,
			);
		}
	}

	const byLot = new Map<string, number>();

	for (const [lotId, sum] of sums) {
		const quantity = round(sum);

		if (quantity > epsilon) {
			byLot.set(lotId, quantity);
		}
	}

	return { total: round(Math.max(total, 0)), byLot };
}

export type RecipeConsumptionCorrection =
	// 足りなかった分を、期限の早いロットから、さらに引く。
	| { kind: "take"; allocations: InventoryLotAllocation[] }
	// 多かった分を、引いたロットへ戻す（期限の遅いロットから。新しいロットは作らない）。
	| { kind: "return"; allocations: InventoryLotAllocation[] }
	| { kind: "none" };

/**
 * 「作った」で引いた量を、target（在庫の単位）に直すための、ロットごとの増減を決める。
 * - 増やすときは、いまの在庫から、期限の早いロットの順に引く。在庫を超えるなら、直せない。
 * - 減らすときは、この操作で引いたロットへ、引いた順の逆（期限の遅いロット）から戻す。
 *   引いたロットが消えていて、戻しきれないなら、直せない（何も書かない）。
 */
export function planRecipeConsumptionCorrection(input: {
	consumed: ConsumedByLot;
	// その食材の、いまのロット（0 のロットも含む）。
	lots: readonly InventoryLot[];
	target: number;
}): RecipeConsumptionCorrection {
	const diff = round(input.target - input.consumed.total);

	if (Math.abs(diff) <= epsilon) {
		return { kind: "none" };
	}

	if (diff > 0) {
		const available = sumLotQuantities(
			input.lots.filter((lot) => lot.quantity > 0),
		);

		if (diff > available + epsilon) {
			throw new UserFacingError(
				"在庫が足りないため、その量には直せません。在庫を確かめてください",
				{ code: "CONFLICT" },
			);
		}

		return {
			kind: "take",
			allocations: allocateDecrease(input.lots, diff, "exact"),
		};
	}

	let rest = -diff;
	const allocations: InventoryLotAllocation[] = [];
	const consumedLots = sortLotsForConsumption(
		input.lots.filter((lot) => input.consumed.byLot.has(lot.id)),
	).reverse();

	for (const lot of consumedLots) {
		if (rest <= epsilon) {
			break;
		}

		const returned = Math.min(input.consumed.byLot.get(lot.id) ?? 0, rest);

		allocations.push({ lotId: lot.id, quantity: round(returned) });
		rest = round(rest - returned);
	}

	if (rest > epsilon) {
		throw new UserFacingError(
			"引いたときの在庫が消えているため、その量には直せません",
			{ code: "CONFLICT" },
		);
	}

	return { kind: "return", allocations };
}
