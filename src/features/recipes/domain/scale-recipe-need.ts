import type { RecipeShoppingNeed } from "./plan-shopping-from-recipe";
import {
	describeScaledAmount,
	describeScaledAmountRange,
	scaleAlternateAmount,
	scaleAmountSupplement,
} from "./scale-amount";
import { weightedRatio } from "./scale-weight";

function round(value: number): number {
	return Number(value.toFixed(6));
}

// 材料の分量を、割合（人数の変更・リンク先の何回分を使うか）で掛ける。数量は丸めず、表記（amountText）だけを丸める。範囲（60~70g）は、下限と上限を掛ける。
// 括弧の言い換え（「1枚(250g)」）も同じ割合で掛け、それ以外の括弧の補足は、表記にそのまま残す。数量のない材料（適量など）は、そのまま。
export function scaleRecipeNeed(
	need: RecipeShoppingNeed,
	baseRatio: number,
): RecipeShoppingNeed {
	// 材料ごとの増減のしかた（やや控えめ・固定など）を掛けた割合。
	const ratio = weightedRatio(baseRatio, need.scaleWeight);

	if (ratio === 1) {
		return need;
	}

	const supplement = scaleAmountSupplement(need.amountText, ratio);
	const alternate = need.alternate
		? { alternate: scaleAlternateAmount(need.alternate, ratio) }
		: {};

	if (need.quantity === null) {
		if (!need.range) {
			return need;
		}

		const range = {
			min: round(need.range.min * ratio),
			max: round(need.range.max * ratio),
		};

		return {
			...need,
			...alternate,
			range,
			amountText: `${describeScaledAmountRange(range, need.unitLabel)}${supplement}`,
		};
	}

	const quantity = round(need.quantity * ratio);

	return {
		...need,
		...alternate,
		quantity,
		amountText: `${describeScaledAmount(quantity, need.unitLabel)}${supplement}`,
	};
}
