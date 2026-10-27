import { describeAmount } from "./merge-recipe-needs";
import type { RecipeShoppingNeed } from "./plan-shopping-from-recipe";

function round(value: number): number {
	return Number(value.toFixed(6));
}

// 材料の分量を、割合（リンク先の何回分を使うか）で掛ける。数量のない材料（適量・範囲など）は、そのまま。
export function scaleRecipeNeed(
	need: RecipeShoppingNeed,
	ratio: number,
): RecipeShoppingNeed {
	if (ratio === 1 || need.quantity === null) {
		return need;
	}

	const quantity = round(need.quantity * ratio);

	return {
		...need,
		quantity,
		amountText: describeAmount(quantity, need.unitLabel),
	};
}
