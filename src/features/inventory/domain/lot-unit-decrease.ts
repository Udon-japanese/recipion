import { convertAmountToStockQuantity } from "#/features/ingredients/domain/convert-to-stock-quantity";
import {
	type InventoryLot,
	type InventoryLotPurchaseUnit,
	sortLotsForConsumption,
} from "./inventory-lot";
import type { InventoryUnitCode } from "./inventory-unit";

// ロットの換算（1個＝110g など）で引く量を決めるときの、端数の扱い。
// up：買った単位の数を切り上げる（うどん200gを、110gの2個で引く）。exact：ぴったり引く（1.8個）。
export const lotRoundings = ["up", "exact"] as const;

export type LotRounding = (typeof lotRoundings)[number];

type Amount = { quantity: number | null; unitLabel: string | null };

// 引きたい量（レシピの分量・入力した量）。言い換え（「1枚(250g)」の 250g）があれば、それも使う。
export type LotUnitAmount = Amount & { alternate?: Amount | null };

// 換算のあるロットから引く分（在庫の単位）。
export type LotUnitPortion = {
	lotId: string;
	purchaseUnit: InventoryLotPurchaseUnit;
	quantity: number;
	// 切り上げたなら true。
	isRoundedUp: boolean;
};

export type LotUnitDecrease = {
	// 引く量（在庫の単位）。ロットの合計を超えない。
	quantity: number;
	// 全部の量に当たる、在庫の量（足りないときは、quantity より多い）。
	required: number;
	isShort: boolean;
	// 換算のあるロットから引く分の内訳（引く順）。
	portions: LotUnitPortion[];
};

const epsilon = 1e-9;

function round(value: number): number {
	return Number(value.toFixed(6));
}

function findAmountIn(amount: LotUnitAmount, unitLabel: string): number | null {
	const matched = [amount, amount.alternate].find(
		(candidate) =>
			candidate?.quantity != null && candidate.unitLabel?.trim() === unitLabel,
	);

	return matched?.quantity ?? null;
}

// 量を、換算の「1つあたりの量」の単位（g・ml・枚など）で表す。g・ml は kg・大さじなども直す。数え方の単位は、同じ呼び名だけ。
function toQuantityUnit(
	amount: LotUnitAmount,
	unitLabel: string,
): number | null {
	if (unitLabel === "g" || unitLabel === "ml") {
		return convertAmountToStockQuantity(amount, { stockUnitCode: unitLabel });
	}

	return findAmountIn(amount, unitLabel);
}

/**
 * このロットの換算で、量の全部に当たる在庫の量。換算が使えなければ null。
 * - 在庫の単位が、買った単位（1個＝110g の「個」）なら、量を g などで表して割る。数を数えるので、切り上げの対象。
 * - 在庫の単位が、1つあたりの量の単位（1玉＝200g の「g」、1パック＝5個 の「個」）なら、買った単位の量に掛ける。
 */
function perAmountByLot(
	unit: InventoryLotPurchaseUnit,
	amount: LotUnitAmount,
	stock: { stockUnitCode: InventoryUnitCode; stockUnitLabel: string },
): { perAmount: number; countsPurchaseUnits: boolean } | null {
	const isStockThePurchaseUnit =
		unit.label === stock.stockUnitLabel ||
		(stock.stockUnitCode === "count" && unit.label === "個");

	if (isStockThePurchaseUnit) {
		const inQuantityUnit = toQuantityUnit(amount, unit.quantityUnitLabel);

		return inQuantityUnit === null
			? null
			: {
					perAmount: round(inQuantityUnit / unit.quantity),
					countsPurchaseUnits: true,
				};
	}

	if (unit.quantityUnitLabel === stock.stockUnitLabel) {
		const inPurchaseUnits = findAmountIn(amount, unit.label);

		return inPurchaseUnits === null
			? null
			: {
					perAmount: round(inPurchaseUnits * unit.quantity),
					countsPurchaseUnits: false,
				};
	}

	return null;
}

/**
 * 量を、ロットの換算で、在庫から引く量にする。ロットは、引く順（期限の早い順）に使い、それぞれ自分の換算で量る。
 * - 換算のないロット（または、換算が量に合わないロット）は、fallbackRequired（カタログの換算での全部の量）で量る。
 * - 切り上げ（up）は、最後に使うロットで、買った単位を数えるときだけ。ロットの残りは超えない。
 * - 換算を使うロットが1つもなければ null（呼び出し側は、これまでどおりの換算で引く）。
 *   量れないロットに当たったときも null（引く順が、在庫の引き算と合わなくなるため）。
 */
export function planLotUnitDecrease(input: {
	lots: readonly InventoryLot[];
	amount: LotUnitAmount;
	stock: { stockUnitCode: InventoryUnitCode; stockUnitLabel: string };
	rounding: LotRounding;
	fallbackRequired: number | null;
}): LotUnitDecrease | null {
	const lots = sortLotsForConsumption(
		input.lots.filter((lot) => lot.quantity > 0),
	);
	const portions: LotUnitPortion[] = [];
	// まだ引いていない、量の割合（1が全部）。
	let rest = 1;
	let taken = 0;
	let lastPerAmount = 0;

	for (const lot of lots) {
		const byLot = lot.purchaseUnit
			? perAmountByLot(lot.purchaseUnit, input.amount, input.stock)
			: null;
		const perAmount = byLot?.perAmount ?? input.fallbackRequired;

		if (perAmount === null || !(perAmount > 0)) {
			return null;
		}

		lastPerAmount = perAmount;

		let take = round(perAmount * rest);
		let isRoundedUp = false;

		if (take > lot.quantity + epsilon) {
			rest -= lot.quantity / perAmount;
			take = lot.quantity;
		} else {
			rest = 0;

			if (byLot?.countsPurchaseUnits && input.rounding === "up") {
				const roundedUp = Math.min(lot.quantity, Math.ceil(take - epsilon));

				isRoundedUp = roundedUp > take;
				take = Math.max(take, roundedUp);
			}
		}

		taken = round(taken + take);

		if (byLot && lot.purchaseUnit) {
			portions.push({
				lotId: lot.id,
				purchaseUnit: lot.purchaseUnit,
				quantity: round(take),
				isRoundedUp,
			});
		}

		if (rest <= epsilon) {
			break;
		}
	}

	if (portions.length === 0) {
		return null;
	}

	const isShort = rest > epsilon;

	return {
		quantity: taken,
		required: isShort ? round(taken + rest * lastPerAmount) : taken,
		isShort,
		portions,
	};
}

/** すでに引いた量（在庫の単位）を、引く順にロットから除いた、残りのロット。 */
export function remainingLotsAfter(
	lots: readonly InventoryLot[],
	takenQuantity: number,
): InventoryLot[] {
	let rest = takenQuantity;

	return sortLotsForConsumption(lots.filter((lot) => lot.quantity > 0)).flatMap(
		(lot) => {
			const used = Math.min(lot.quantity, Math.max(rest, 0));

			rest = round(rest - used);

			const quantity = round(lot.quantity - used);

			return quantity > 0 ? [{ ...lot, quantity }] : [];
		},
	);
}

type StockUnit = { stockUnitCode: InventoryUnitCode; stockUnitLabel: string };

/**
 * ロットの換算から、在庫の単位のほかに、量を打てる単位（在庫が個で 1個＝110g なら g、在庫が g で 1玉＝200g なら 玉）。
 * 換算のあるロットの新しいものから順に、重ねずに並べる。在庫の単位は含めない。
 */
export function listLotAmountUnits(
	lots: readonly InventoryLot[],
	stock: StockUnit,
): string[] {
	const units = lots
		.filter((lot) => lot.quantity > 0)
		.flatMap((lot) => {
			const unit = lot.purchaseUnit;

			if (!unit) {
				return [];
			}

			if (
				unit.label === stock.stockUnitLabel ||
				(stock.stockUnitCode === "count" && unit.label === "個")
			) {
				return [unit.quantityUnitLabel];
			}

			return unit.quantityUnitLabel === stock.stockUnitLabel
				? [unit.label]
				: [];
		});

	return [...new Set(units)].filter((unit) => unit !== stock.stockUnitLabel);
}

/**
 * 打った量（ロットの換算の単位）を、在庫の単位の量にする（引く順に、ロットごとの換算で量る。端数はぴったり）。
 * ロットの合計を超える量も、そのまま返す（足りないときの扱いは、在庫の引き算に任せる）。量れなければ null。
 */
export function convertLotUnitAmount(
	lots: readonly InventoryLot[],
	amount: { quantity: number; unitLabel: string },
	stock: StockUnit,
): number | null {
	return (
		planLotUnitDecrease({
			lots,
			amount,
			stock,
			rounding: "exact",
			fallbackRequired: null,
		})?.required ?? null
	);
}
