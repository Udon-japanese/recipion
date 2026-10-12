import { findIngredientCatalogEntry } from "./ingredient-catalog";

export type StockUnitOption = {
	stockUnitCode: "count" | "g" | "ml";
	stockUnitLabel: string;
};

/**
 * 食材の在庫の単位として選べる候補。g、（密度のある食材は）ml、個数（その食材の数え方：本・玉・株・枚など）。
 * カタログにない食材は、g・ml・個。現在の単位も含める（呼び出し側で除く）。
 */
export function listStockUnitOptions(
	ingredientName: string,
): StockUnitOption[] {
	const entry = findIngredientCatalogEntry(ingredientName);
	const options: StockUnitOption[] = [
		{ stockUnitCode: "g", stockUnitLabel: "g" },
	];

	if (!entry || entry.density) {
		options.push({ stockUnitCode: "ml", stockUnitLabel: "ml" });
	}

	const countLabels = new Set<string>(
		(entry?.unitWeights ?? []).map((weight) => weight.unit),
	);

	countLabels.add("個");

	for (const label of countLabels) {
		options.push({ stockUnitCode: "count", stockUnitLabel: label });
	}

	return options;
}
