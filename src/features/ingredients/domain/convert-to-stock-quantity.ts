import type {
	IngredientCatalogEntry,
	IngredientStockUnitCode,
	IngredientUnitWeight,
} from "./ingredient-catalog";

type BaseQuantity =
	| { kind: "mass"; grams: number }
	| { kind: "volume"; milliliters: number }
	| { kind: "count"; unitLabel: string | null; count: number };

const massUnitGrams: Record<string, number> = {
	g: 1,
	kg: 1000,
};

// 大さじ1＝15ml、小さじ1＝5ml、カップ1＝200ml。
const volumeUnitMilliliters: Record<string, number> = {
	ml: 1,
	cc: 1,
	l: 1000,
	大さじ: 15,
	小さじ: 5,
	カップ: 200,
};

function toBaseQuantity(
	quantity: number,
	unitLabel: string | null,
): BaseQuantity {
	const normalizedUnitLabel = unitLabel?.trim().toLocaleLowerCase("ja-JP");

	if (normalizedUnitLabel && normalizedUnitLabel in massUnitGrams) {
		return {
			kind: "mass",
			grams: quantity * (massUnitGrams[normalizedUnitLabel] ?? 1),
		};
	}

	if (normalizedUnitLabel && normalizedUnitLabel in volumeUnitMilliliters) {
		return {
			kind: "volume",
			milliliters: quantity * (volumeUnitMilliliters[normalizedUnitLabel] ?? 1),
		};
	}

	return {
		kind: "count",
		unitLabel: normalizedUnitLabel ?? null,
		count: quantity,
	};
}

// 「個」「本」などの1つあたりの重さ。サイズの指定がなければ、中サイズ、なければ最初の定義を使う。
function findUnitWeight(
	entry: IngredientCatalogEntry,
	unitLabel: string | null,
): IngredientUnitWeight | undefined {
	const weights = entry.unitWeights ?? [];
	const sameUnit = unitLabel
		? weights.filter((weight) => weight.unit === unitLabel)
		: [];

	return sameUnit.find((weight) => weight.size === "中") ?? sameUnit[0];
}

// 「個」は、どの数え方にも使える総称。在庫の単位が「個」なら、数え方の違い（本・枚など）は、区別しない。
const genericCountLabel = "個";

// 在庫の単位が個数のとき、重さや体積から個数を出すための、1つ分の重さ。在庫の単位の呼び名（本・玉・枚など）に
// 合う重さがあれば、それを使う。なければ、代表の重さ（中サイズ、なければ最初の定義）を使う。
function findStockUnitWeight(
	entry: IngredientCatalogEntry,
	stockUnitLabel: string | null | undefined,
): IngredientUnitWeight | undefined {
	if (stockUnitLabel && stockUnitLabel !== genericCountLabel) {
		const matched = findUnitWeight(entry, stockUnitLabel);

		if (matched) {
			return matched;
		}
	}

	return findRepresentativeWeight(entry);
}

// 在庫の単位が「個」のとき、重さや体積から個数を出すための、代表の1個の重さ。
function findRepresentativeWeight(
	entry: IngredientCatalogEntry,
): IngredientUnitWeight | undefined {
	const weights = entry.unitWeights ?? [];

	return weights.find((weight) => weight.size === "中") ?? weights[0];
}

function round(value: number): number {
	return Number(value.toFixed(6));
}

/**
 * レシピの分量を、在庫の単位に換算する。換算できなければ null（呼び出し側は、在庫の有無で判定する）。
 * 食材のカタログ（密度、個数ごとの重さ）がある場合だけ、重さ・体積・個数をまたいで換算できる。
 */
export function convertToStockQuantity(
	input: {
		quantity: number;
		unitLabel: string | null;
		stockUnitCode: IngredientStockUnitCode;
		// 在庫の単位の呼び名（個・本・玉・枚など）。個数の在庫のとき、重さの換算と、数え方の違い（本と枚など）の換算に使う。
		stockUnitLabel?: string | null;
	},
	entry?: IngredientCatalogEntry,
): number | null {
	if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
		return null;
	}

	const base = toBaseQuantity(input.quantity, input.unitLabel);
	const gramsPerMl = entry?.density?.gramsPerMl;

	switch (base.kind) {
		case "mass": {
			if (input.stockUnitCode === "g") {
				return round(base.grams);
			}

			if (input.stockUnitCode === "ml") {
				return gramsPerMl ? round(base.grams / gramsPerMl) : null;
			}

			const representative =
				entry && findStockUnitWeight(entry, input.stockUnitLabel);

			return representative ? round(base.grams / representative.grams) : null;
		}

		case "volume": {
			if (input.stockUnitCode === "ml") {
				return round(base.milliliters);
			}

			if (!gramsPerMl) {
				return null;
			}

			const grams = base.milliliters * gramsPerMl;

			if (input.stockUnitCode === "g") {
				return round(grams);
			}

			const representative =
				entry && findStockUnitWeight(entry, input.stockUnitLabel);

			return representative ? round(grams / representative.grams) : null;
		}

		case "count": {
			if (input.stockUnitCode === "count") {
				const label = base.unitLabel;
				const stockLabel = input.stockUnitLabel;

				// 数え方が同じ、またはどちらかが総称（個）・指定なしなら、そのままの数。
				if (
					!label ||
					!stockLabel ||
					label === stockLabel ||
					label === genericCountLabel ||
					stockLabel === genericCountLabel
				) {
					return round(base.count);
				}

				// 数え方が違う（本と枚など）ときは、1つ分の重さを通して換算する。重さが分からなければ、換算しない。
				const from = entry && findUnitWeight(entry, label);
				const to = entry && findUnitWeight(entry, stockLabel);

				return from && to ? round((base.count * from.grams) / to.grams) : null;
			}

			if (input.stockUnitCode === "g") {
				const unitWeight = entry && findUnitWeight(entry, base.unitLabel);

				return unitWeight ? round(base.count * unitWeight.grams) : null;
			}

			return null;
		}
	}
}
