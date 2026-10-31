import { describeAmount, describeAmountRange } from "./merge-recipe-needs";
import type { RecipeShoppingNeed } from "./plan-shopping-from-recipe";

function round(value: number): number {
	return Number(value.toFixed(6));
}

// 材料の分量を、割合（リンク先の何回分を使うか）で掛ける。範囲（60~70g）は、下限と上限を掛ける。
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
			amountText: describeAmountRange(range, need.unitLabel),
		};
	}

	const quantity = round(need.quantity * ratio);

	return {
		...need,
		quantity,
		amountText: describeAmount(quantity, need.unitLabel),
	};
}
