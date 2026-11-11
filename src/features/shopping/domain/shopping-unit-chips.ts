import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "#/features/ingredients/domain/ingredient-catalog";
import {
	findMeasureUnit,
	measureUnitLabel,
} from "#/features/quantity/domain/measure-units";
import {
	type ShoppingConversionDefaults,
	toConversionDefaultKey,
} from "./shopping-conversion-default";
import type { ShoppingItemMemories } from "./shopping-item-memory";

// 買い物メモの追加・編集の、単位のチップ（その人がよく使う単位を、食材ごとに）。
export const maxShoppingUnitChips = 5;

// 記憶もカタログもないときに、足りない分を埋める単位。
const fallbackUnits = ["個", "本", "パック", "袋", "g"] as const;

/**
 * 単位を見分けるキー。重さ・体積は、大きさによらず1つ（g と kg は同じチップ。cc は ml と同じ）。
 * ほかの単位は、全角半角・大文字小文字の違いを無視する。
 */
export function toUnitChipKey(unit: string): string {
	return (
		findMeasureUnit(unit)?.kind ??
		unit.normalize("NFKC").trim().toLocaleLowerCase("ja-JP")
	);
}

// チップに出す文字（cc は、選ぶ単位に出さないので ml にする。kg・L は、そのまま）。
function toChipLabel(unit: string): string {
	const found = findMeasureUnit(unit);

	return found ? measureUnitLabel(found.kind, found.isLarger) : unit.trim();
}

/**
 * 単位のチップの並び（同じ単位は1回だけ、最大5つ）。
 * ① その食材で使った単位（前回の単位 → 換算の記憶の単位、新しい順）
 * ② カタログ（一般的な売られ方 → よく使う数量の単位 → 重さのある数え方 → 在庫の単位）
 * ③ ほかの食材も含めて、よく使う単位（いつもの買い方の記憶で、使った食材の多い順。同じ数なら、新しく使った順）
 * ④ 固定の「個・本・パック・袋・g」
 * 重さ・体積のチップの文字は、preferMeasureUnit で、その食材で最後に選んだ方（g か kg）にする。
 */
export function listShoppingUnitChips({
	itemName,
	itemMemories,
	conversionDefaults,
	preferMeasureUnit = (unit) => unit,
}: {
	itemName: string;
	itemMemories: ShoppingItemMemories;
	conversionDefaults: ShoppingConversionDefaults;
	preferMeasureUnit?: (unit: string) => string;
}): string[] {
	const nameKey = toConversionDefaultKey(itemName);
	const memory = nameKey ? itemMemories[nameKey] : undefined;
	const usedUnits = [
		memory?.unitLabel,
		...Object.values(conversionDefaults)
			.filter((entry) => entry.nameKey === nameKey)
			.sort((a, b) => b.usedAt - a.usedAt)
			.map((entry) => entry.unitLabel),
	];
	const entry = nameKey ? findIngredientCatalogEntry(itemName) : undefined;
	const catalogUnits = entry
		? [
				entry.usualRetailUnit?.unitLabel,
				...(entry.presets ?? []).map((preset) => preset.unitLabel),
				...(entry.unitWeights ?? []).map((weight) => weight.unit),
				getDefaultStockUnitLabel(entry.stockUnitCode),
			]
		: [];
	const chips = new Map<string, string>();

	for (const unit of [
		...usedUnits,
		...catalogUnits,
		...listFrequentUnits(itemMemories),
		...fallbackUnits,
	]) {
		if (chips.size >= maxShoppingUnitChips) {
			break;
		}

		if (!unit || unit.trim() === "") {
			continue;
		}

		const key = toUnitChipKey(unit);

		if (!chips.has(key)) {
			const label = toChipLabel(unit);

			chips.set(key, findMeasureUnit(label) ? preferMeasureUnit(label) : label);
		}
	}

	return [...chips.values()];
}

// いつもの買い方の記憶の単位を、使った食材の多い順に（同じ数なら、新しく使った順）。
function listFrequentUnits(itemMemories: ShoppingItemMemories): string[] {
	const counts = new Map<
		string,
		{ unit: string; count: number; usedAt: number }
	>();

	for (const memory of Object.values(itemMemories)) {
		if (!memory.unitLabel || memory.unitLabel.trim() === "") {
			continue;
		}

		const key = toUnitChipKey(memory.unitLabel);
		const current = counts.get(key);

		counts.set(key, {
			unit:
				current && current.usedAt > memory.usedAt
					? current.unit
					: memory.unitLabel,
			count: (current?.count ?? 0) + 1,
			usedAt: Math.max(current?.usedAt ?? 0, memory.usedAt),
		});
	}

	return [...counts.values()]
		.sort((a, b) => b.count - a.count || b.usedAt - a.usedAt)
		.map((entry) => entry.unit);
}
