import { type InventoryLot, sortLotsForConsumption } from "./inventory-lot";

export type StockUnitChangePlan = {
	// 在庫のあるロットの、変更後の数量（在庫の単位を変えたあと）。
	lotQuantities: { lotId: string; quantity: number }[];
	// ロットがないのに、数量が入力されたとき、新しく作るロットの数量（なければ 0）。
	newLotQuantity: number;
	// 換算した合計と、入力された量との差（変更後の単位）。差がなければ 0。履歴に残す。
	adjustmentFromConversion: number;
};

function round(value: number): number {
	return Number(value.toFixed(6));
}

/**
 * 在庫の単位を変えたときの、ロットの数量を決める。
 * - 換算できる（factor がある）とき：ロットごとに換算する（割り振りではない。期限は保つ）。
 *   入力された量（currentQuantity）が、換算した合計と食い違うときは、均等に割らず、期限が近いロットから調整する
 *   （少なければ、期限の近いロットから減らす。多ければ、期限の近いロットに足す＝早く使う側に寄せる）。
 * - 換算できない（factor が null）とき：入力された量を、期限が最も早いロットに寄せ、他は 0 にする。
 *   量が入力されていなければ、エラー。
 */
export function planStockUnitChange(input: {
	lots: readonly InventoryLot[];
	factor: number | null;
	currentQuantity?: number;
}): StockUnitChangePlan {
	const sorted = sortLotsForConsumption(
		input.lots.filter((lot) => lot.quantity > 0),
	);

	if (input.factor === null) {
		if (input.currentQuantity === undefined) {
			throw new Error(
				"この単位には換算できないため、いまの量を入力してください",
			);
		}

		const quantity = input.currentQuantity;

		return {
			lotQuantities: sorted.map((lot, index) => ({
				lotId: lot.id,
				quantity: index === 0 ? quantity : 0,
			})),
			newLotQuantity: sorted.length === 0 ? quantity : 0,
			adjustmentFromConversion: 0,
		};
	}

	const factor = input.factor;
	const converted = sorted.map((lot) => ({
		lotId: lot.id,
		quantity: round(lot.quantity * factor),
	}));
	const convertedTotal = round(
		converted.reduce((sum, lot) => sum + lot.quantity, 0),
	);

	if (input.currentQuantity === undefined) {
		return {
			lotQuantities: converted,
			newLotQuantity: 0,
			adjustmentFromConversion: 0,
		};
	}

	let difference = round(input.currentQuantity - convertedTotal);
	const adjustment = difference;

	if (difference < 0) {
		// 期限の近いロットから減らす。
		for (const lot of converted) {
			const reduced = Math.min(lot.quantity, -difference);

			lot.quantity = round(lot.quantity - reduced);
			difference = round(difference + reduced);
		}
	} else if (difference > 0) {
		const [first] = converted;

		if (first) {
			first.quantity = round(first.quantity + difference);
			difference = 0;
		}
	}

	return {
		lotQuantities: converted,
		newLotQuantity: converted.length === 0 && adjustment > 0 ? adjustment : 0,
		adjustmentFromConversion: adjustment,
	};
}
