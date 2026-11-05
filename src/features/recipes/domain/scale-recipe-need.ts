import type { RecipeShoppingNeed } from "./plan-shopping-from-recipe";
import {
	describeScaledAmount,
	describeScaledAmountRange,
} from "./scale-amount";

function round(value: number): number {
	return Number(value.toFixed(6));
}

// 材料の分量を、割合（人数の変更・リンク先の何回分を使うか）で掛ける。数量は丸めず、表記（amountText）だけを丸める。範囲（60~70g）は、下限と上限を掛ける。
// 数量のない材料（適量など）は、そのまま。
export function scaleRecipeNeed(
	need: RecipeShoppingNeed,
	ratio: number,
): RecipeShoppingNeed {
	if (ratio === 1) {
		return need;
	}

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
			range,
			amountText: describeScaledAmountRange(range, need.unitLabel),
		};
	}

	const quantity = round(need.quantity * ratio);

	return {
		...need,
		quantity,
		amountText: describeScaledAmount(quantity, need.unitLabel),
	};
}
