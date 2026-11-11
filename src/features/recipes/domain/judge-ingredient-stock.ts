import { convertAmountToStockQuantity } from "#/features/ingredients/domain/convert-to-stock-quantity";
import {
	findIngredientCatalogEntry,
	type IngredientStockUnitCode,
} from "#/features/ingredients/domain/ingredient-catalog";
import type { AlternateAmount } from "#/features/ingredients/domain/parse-ingredient-line";
import type { InventoryLot } from "#/features/inventory/domain/inventory-lot";
import { planLotUnitDecrease } from "#/features/inventory/domain/lot-unit-decrease";

export type RecipeIngredientNeed = {
	name: string;
	// 「少々」「適量」「60~70g」など、数量にできない分量は null。
	quantity: number | null;
	unitLabel: string | null;
	// 分量の言い換え（「1枚(250g)」の 250g）。在庫の単位と、そのまま比べられるときに使う。
	alternate?: AlternateAmount | null;
};

export type IngredientStock = {
	quantity: number;
	stockUnitCode: IngredientStockUnitCode;
	// 在庫の単位の呼び名（個・本・玉・枚など）。換算に使う。
	stockUnitLabel?: string;
	// 有無だけ（ある／ない）で管理している食材。量は比べず、在庫があれば、足りているとする。
	isPresenceOnly?: boolean;
	// 在庫のあるロット。換算（1個＝110g など）があれば、それで量る。省略は、ロットの換算を使わない。
	lots?: readonly InventoryLot[];
};

export type IngredientStockJudgment =
	| {
			status: "enough";
			// compared: 数量を比べた。presence: 比べられないので、在庫があるかだけで判定した。
			basis: "compared" | "presence";
	  }
	| {
			status: "short";
			basis: "compared" | "presence";
			// 数量を比べたときの、不足分（在庫の単位）。在庫の有無で判定したときは null。
			shortage: number | null;
			// 在庫の登録がない（false）か、登録はあるが 0（true）か。
			isRegistered: boolean;
			// 在庫が 0 より多いか（あるが、足りないとき true）。false なら、在庫がない（登録がないか、0）。
			hasStock: boolean;
	  };

/**
 * レシピの材料が、在庫で足りているかを判定する。
 *
 * - 数量があり、在庫の単位へ換算できるとき：数量を比べる。
 * - 比べられないとき（「少々」「適量」、換算できない単位など）：在庫が0より多ければ足りている。
 *   在庫が0、または登録がなければ不足。
 * - 有無だけで管理している食材（塩・醤油・油など）：量にかかわらず、在庫があれば足りている。
 * - ロットに換算（1個＝110g など）があれば、期限の早いロットから、それぞれの換算で量る（planLotUnitDecrease）。
 *   そのときの不足は、個数の在庫なら切り上げる（買うのは、まるごとの数のため。設定の端数は、引くときだけ）。
 */
export function judgeIngredientStock(
	need: RecipeIngredientNeed,
	stock: IngredientStock | null,
): IngredientStockJudgment {
	const hasStock = stock !== null && stock.quantity > 0;
	const isPresenceOnly = stock?.isPresenceOnly === true;

	const catalogRequired =
		stock !== null && need.quantity !== null && !isPresenceOnly
			? convertAmountToStockQuantity(
					need,
					stock,
					findIngredientCatalogEntry(need.name),
				)
			: null;
	const lotDecrease =
		stock !== null && need.quantity !== null && !isPresenceOnly
			? planLotUnitDecrease({
					lots: stock.lots ?? [],
					amount: need,
					stock: {
						stockUnitCode: stock.stockUnitCode,
						stockUnitLabel: stock.stockUnitLabel ?? "",
					},
					rounding: "exact",
					fallbackRequired: catalogRequired,
				})
			: null;

	if (stock !== null && lotDecrease) {
		if (!lotDecrease.isShort) {
			return { status: "enough", basis: "compared" };
		}

		const shortage = Number((lotDecrease.required - stock.quantity).toFixed(6));

		return {
			status: "short",
			basis: "compared",
			shortage:
				stock.stockUnitCode === "count" ? Math.ceil(shortage - 1e-9) : shortage,
			isRegistered: true,
			hasStock: stock.quantity > 0,
		};
	}

	const requiredQuantity = catalogRequired;

	if (stock === null || requiredQuantity === null) {
		return hasStock
			? { status: "enough", basis: "presence" }
			: {
					status: "short",
					basis: "presence",
					shortage: null,
					isRegistered: stock !== null,
					hasStock: false,
				};
	}

	if (stock.quantity >= requiredQuantity) {
		return { status: "enough", basis: "compared" };
	}

	return {
		status: "short",
		basis: "compared",
		shortage: Number((requiredQuantity - stock.quantity).toFixed(6)),
		isRegistered: true,
		hasStock: stock.quantity > 0,
	};
}
