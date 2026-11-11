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
 * マスタにない食材は、g・ml・個（自分で入力する呼び名は、allowsCustomStockUnit と resolveStockUnitChoice）。
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

// 選択の欄で、自分で入力した呼び名（個数）を選んだときの値。
export const customStockUnitValue = "custom";

// 自分で入力する呼び名の、長さの上限。
export const maxStockUnitLabelLength = 10;

// 選択の欄の値（"g:g"・"count:枚" の形）。
export function toStockUnitValue(option: StockUnitOption): string {
	return `${option.stockUnitCode}:${option.stockUnitLabel}`;
}

/**
 * 在庫の単位に、自分で入力した呼び名（パック・袋など、個数）を使えるか。
 * マスタにない食材だけ（マスタにある食材は、マスタの単位だけ。足りない数え方は、マスタに足す）。
 */
export function allowsCustomStockUnit(ingredientName: string): boolean {
	return findIngredientCatalogEntry(ingredientName) === undefined;
}

/**
 * 選択の欄の値を、在庫の単位にする。
 * - 候補の値なら、その候補。
 * - 「その他」なら、入力した呼び名の個数（呼び名が空、または自分で入力できない食材なら、null）。
 * - どちらでもなければ、null。
 */
export function resolveStockUnitChoice(
	ingredientName: string,
	value: string,
	customLabel: string,
): StockUnitOption | null {
	if (value === customStockUnitValue) {
		const label = customLabel.trim();

		return label !== "" && allowsCustomStockUnit(ingredientName)
			? { stockUnitCode: "count", stockUnitLabel: label }
			: null;
	}

	return (
		listStockUnitOptions(ingredientName).find(
			(option) => toStockUnitValue(option) === value,
		) ?? null
	);
}
