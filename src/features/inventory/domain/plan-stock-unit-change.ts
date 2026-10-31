import { UserFacingError } from "#/errors/user-facing-error";
import type { InventoryLot } from "./inventory-lot";

export type StockUnitChangedLot = {
	lotId: string;
	// 変更後の数量（新しい単位）。
	quantity: number;
	// 換算した数量との差（新しい単位）。ユーザーが数量を直したときだけ、0 以外。履歴に残す。
	adjustment: number;
};

function round(value: number): number {
	return Number(value.toFixed(6));
}

/**
 * 在庫の単位を変えたときの、ロットごとの数量を決める。
 * - ロットごとに、本人が入力した数量（lotQuantities）があれば、それを使う。なければ、換算する（期限は保つ）。
 * - 換算できない（factor が null）単位に変えるとき、ロットの数量が入力されていなければ、エラー。
 * - 在庫のないロット（数量 0）は、対象にしない。
 */
export function planStockUnitChange(input: {
	lots: readonly InventoryLot[];
	factor: number | null;
	lotQuantities?: readonly { lotId: string; quantity: number }[];
}): StockUnitChangedLot[] {
	const stocked = input.lots.filter((lot) => lot.quantity > 0);
	const stockedIds = new Set(stocked.map((lot) => lot.id));
	const entered = new Map<string, number>();

	for (const { lotId, quantity } of input.lotQuantities ?? []) {
		if (!stockedIds.has(lotId)) {
			throw new UserFacingError("在庫のあるロットを指定してください");
		}

		if (!(quantity >= 0) || !Number.isFinite(quantity)) {
			throw new UserFacingError("ロットの数量は0以上にしてください");
		}

		entered.set(lotId, round(quantity));
	}

	return stocked.map((lot) => {
		const converted =
			input.factor === null ? null : round(lot.quantity * input.factor);
		const quantity = entered.get(lot.id) ?? converted;

		if (quantity === null) {
			throw new UserFacingError(
				"この単位には換算できないため、ロットごとの量を入力してください",
			);
		}

		return {
			lotId: lot.id,
			quantity,
			adjustment: converted === null ? 0 : round(quantity - converted),
		};
	});
}
