import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "./ingredient-catalog";

export type StockUnitOption = {
	stockUnitCode: "count" | "g" | "ml";
	stockUnitLabel: string;
};

/**
 * 食材の在庫の単位として選べる候補。食材のマスタ（カタログ）にある単位だけを出す。
 * - g：その食材の標準の単位が g か、重さの定義（1本・1枚が何g）か密度があるとき。
 * - ml：標準の単位が ml か、密度があるとき。
 * - 個数：重さの定義にある数え方（鶏もも肉は枚、大根は本、キャベツは枚・玉）。標準の単位が個数なら、その呼び名（個）も。
 * マスタにない食材は、g・ml・個（自由に入力する単位は、画面で足す）。
 */
export function listStockUnitOptions(
	ingredientName: string,
): StockUnitOption[] {
	const entry = findIngredientCatalogEntry(ingredientName);

	if (!entry) {
		return [
			{ stockUnitCode: "g", stockUnitLabel: "g" },
			{ stockUnitCode: "ml", stockUnitLabel: "ml" },
			{ stockUnitCode: "count", stockUnitLabel: "個" },
		];
	}

	const options: StockUnitOption[] = [];
	const weightUnits = (entry.unitWeights ?? []).map((weight) => weight.unit);

	if (entry.stockUnitCode === "g" || entry.density || weightUnits.length > 0) {
		options.push({ stockUnitCode: "g", stockUnitLabel: "g" });
	}

	if (entry.stockUnitCode === "ml" || entry.density) {
		options.push({ stockUnitCode: "ml", stockUnitLabel: "ml" });
	}

	const countLabels = new Set<string>(weightUnits);

	if (entry.stockUnitCode === "count") {
		countLabels.add(getDefaultStockUnitLabel("count"));
	}

	for (const label of countLabels) {
		options.push({ stockUnitCode: "count", stockUnitLabel: label });
	}

	return options;
}
