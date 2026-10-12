import { convertToStockQuantity } from "#/features/ingredients/domain/convert-to-stock-quantity";
import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "#/features/ingredients/domain/ingredient-catalog";
import type { ShoppingItemInventoryConversion } from "./shopping-item";

// 在庫の単位が個数の食材で、数えるときの単位として、そのまま 1 つ 1 つに換算してよいもの。
// 「袋」「パック」などは、食材ごとに中身の数が違うので、数量プリセットがある場合だけ換算する。
const countLikeUnits: ReadonlySet<string> = new Set([
	"個",
	"本",
	"枚",
	"玉",
	"丁",
	"株",
	"粒",
	"切れ",
	"片",
	"尾",
]);

const unitCodes: Record<string, string> = {
	個: "count",
	g: "g",
	kg: "kg",
	ml: "ml",
	l: "l",
};

function toInputUnitCode(unit: string): string {
	return unitCodes[unit.toLocaleLowerCase("ja-JP")] ?? unit;
}

/**
 * 買い物メモの項目（食材名と単位）から、在庫への換算を決める。決められなければ null。
 *
 * 1. 数量プリセットと単位が一致すれば、そのプリセットの換算（同じ単位で換算が違うプリセットが複数あるときは決めない）。
 * 2. 単位が空で、在庫の単位が個数なら、1個ずつ。
 * 3. 単位が在庫の単位と同じなら、そのまま（1:1）。
 * 4. それ以外は、カタログの重さ・密度で、1単位が在庫の単位でいくつか計算できるとき。
 *
 * 食材がカタログになければ、決めない（購入確定のときに、設定してもらう）。
 */
export function inferInventoryConversion(
	name: string,
	unitLabel: string | null,
): ShoppingItemInventoryConversion | null {
	const entry = findIngredientCatalogEntry(name);

	if (!entry) {
		return null;
	}

	const unit = unitLabel?.trim() || null;
	const { stockUnitCode } = entry;
	const stockUnitLabel = getDefaultStockUnitLabel(stockUnitCode);
	const trackingMode = entry.defaultTrackingMode;

	const conversion = (
		inputUnitCode: string,
		stockQuantityPerInputUnit: number,
	): ShoppingItemInventoryConversion => ({
		inputUnitCode,
		stockUnitCode,
		stockUnitLabel,
		stockQuantityPerInputUnit,
		trackingMode,
	});

	// 有無だけで管理する食材（調味料など）は、量の換算がいらない。買ったら「ある」になる。
	if (trackingMode === "presence") {
		return conversion(unit ? toInputUnitCode(unit) : stockUnitCode, 1);
	}

	if (unit === null) {
		return stockUnitCode === "count" ? conversion("count", 1) : null;
	}

	const matchingPresets = (entry.presets ?? []).filter(
		(preset) => preset.unitLabel === unit,
	);

	if (matchingPresets.length > 0) {
		const [first] = matchingPresets;
		const isUnambiguous = matchingPresets.every(
			(preset) =>
				preset.inventoryConversion.stockQuantityPerInputUnit ===
				first?.inventoryConversion.stockQuantityPerInputUnit,
		);

		return first && isUnambiguous ? first.inventoryConversion : null;
	}

	if (unit === stockUnitLabel) {
		return conversion(stockUnitCode, 1);
	}

	if (stockUnitCode === "count" && !countLikeUnits.has(unit)) {
		// 重さ・体積の単位だけ、カタログの重さで換算できる（「袋」などは決めない）。
		const isWeightOrVolume = ["g", "kg", "ml", "l"].includes(
			unit.toLocaleLowerCase("ja-JP"),
		);

		if (!isWeightOrVolume) {
			return null;
		}
	}

	const perUnit = convertToStockQuantity(
		{ quantity: 1, unitLabel: unit, stockUnitCode },
		entry,
	);

	return perUnit === null ? null : conversion(toInputUnitCode(unit), perUnit);
}
