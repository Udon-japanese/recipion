import type { RecipeConsumptionRow } from "./plan-recipe-consumption";

// 「作った」で在庫に入れたできあがり（作り置き）を、リンクの材料として引く行の ID の印。
export const madeRecipeNeedIdPrefix = "made/";

type MadeRecipeStockItem = {
	inventoryItemId: string;
	quantity: number;
	trackingMode?: string;
	sourceRecipePublicId?: string;
};

// 在庫にある、できあがり（作り置き）の量（元のレシピの publicId → 回分）。
export function collectMadeRecipeStock(
	items: readonly MadeRecipeStockItem[],
): Map<string, number> {
	const stock = new Map<string, number>();

	for (const item of items) {
		if (
			item.sourceRecipePublicId !== undefined &&
			item.trackingMode !== "presence" &&
			item.quantity > 0
		) {
			stock.set(
				item.sourceRecipePublicId,
				(stock.get(item.sourceRecipePublicId) ?? 0) + item.quantity,
			);
		}
	}

	return stock;
}

export type MadeRecipeUse = {
	publicId: string;
	name: string;
	// 在庫のできあがりから使う量（回分）。
	quantity: number;
};

/**
 * リンク先のレシピを、在庫のできあがりから使うときの、引く行。
 * リンク先の材料は、この量の分だけ、引かない（展開は、残りの分だけ）。
 */
export function planMadeRecipeConsumption(
	uses: readonly MadeRecipeUse[],
	stockItems: readonly MadeRecipeStockItem[],
): RecipeConsumptionRow[] {
	return uses.flatMap((use) => {
		const item = stockItems.find(
			(candidate) => candidate.sourceRecipePublicId === use.publicId,
		);

		if (!item || use.quantity <= 0) {
			return [];
		}

		return [
			{
				need: {
					id: `${madeRecipeNeedIdPrefix}${use.publicId}`,
					name: use.name,
					quantity: use.quantity,
					unitLabel: "回分",
					amountText: null,
				},
				status: "consume" as const,
				target: {
					inventoryItemId: item.inventoryItemId,
					name: use.name,
					stockUnitCode: "count" as const,
					stockUnitLabel: "回分",
				},
				deduct: use.quantity,
				required: use.quantity,
				viaStandIn: false,
				alternatives: [],
			},
		];
	});
}
