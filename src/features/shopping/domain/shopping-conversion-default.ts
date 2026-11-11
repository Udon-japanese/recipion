import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "#/features/ingredients/domain/ingredient-catalog";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import { toInputUnitCode } from "./infer-inventory-conversion";
import type { ParsedShoppingMemoLine } from "./parse-shopping-memo";
import {
	isSameUnitConversion,
	type ShoppingItemInventoryConversion,
} from "./shopping-item";
import type { ShoppingItemMemories } from "./shopping-item-memory";

// ユーザーが決めた在庫換算の記憶（食材×買う単位×換算ごとに1件。食材ごとに最大 maxConversionMemoriesPerItem 件）。
// 買う単位の呼び名（例：本）と、その1単位が在庫でいくつか（例：1本＝1000ml）の組。
// 同じ単位でも、換算が違えば別の1件（1個＝200g と 1個＝110g）。1件を見分けるのは中身で、鍵は ID（意味を持たない）。
export type ShoppingConversionDefault = {
	// 単位なしで決めたときは null。
	unitLabel: string | null;
	inventoryConversion: ShoppingItemInventoryConversion;
};

// 覚える中身。quantity は、その換算で最後に買った数量（「前の買い方」のチップの数量）。
// 在庫の画面で決めた換算は、買う数量がないので、持たない（チップは1つ分で出す）。
export type ShoppingConversionMemoryValue = ShoppingConversionDefault & {
	quantity?: number;
};

// 記憶1件。usedAt は最後に使った時刻（ミリ秒）。食材のいつもの単位は、最後に使った単位。
export type ShoppingConversionEntry = ShoppingConversionMemoryValue & {
	nameKey: string;
	usedAt: number;
};

// 記憶の鍵（ID）→ 記憶。
export type ShoppingConversionDefaults = Record<
	string,
	ShoppingConversionEntry
>;

// 食材名のキー（食材名を正規化したもの。空の名前は、覚えない）。
export function toConversionDefaultKey(itemName: string): string | null {
	return itemName.trim() === "" ? null : normalizeIngredientName(itemName);
}

function normalizeUnit(unit: string | null): string | null {
	const normalized = unit?.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");

	return normalized ? normalized : null;
}

// 食材ごとに残す記憶の数（「前の買い方」のチップと同じ数）。
export const maxConversionMemoriesPerItem = 2;

// 2つの記憶が、同じ内容か（同じなら、使った時刻だけを新しくする）。
export function isSameConversionDefault(
	left: ShoppingConversionDefault,
	right: ShoppingConversionDefault,
): boolean {
	const a = left.inventoryConversion;
	const b = right.inventoryConversion;

	return (
		normalizeUnit(left.unitLabel) === normalizeUnit(right.unitLabel) &&
		a.inputUnitCode === b.inputUnitCode &&
		a.stockUnitCode === b.stockUnitCode &&
		a.stockUnitLabel === b.stockUnitLabel &&
		a.stockQuantityPerInputUnit === b.stockQuantityPerInputUnit &&
		a.trackingMode === b.trackingMode
	);
}

// 食材名と単位に対する記憶（その単位で、いちばん新しく使ったもの。なければ undefined）。
export function findConversionDefault(
	defaults: ShoppingConversionDefaults,
	itemName: string,
	unitLabel: string | null,
): ShoppingConversionEntry | undefined {
	const nameKey = toConversionDefaultKey(itemName);

	if (!nameKey) {
		return undefined;
	}

	const unit = normalizeUnit(unitLabel);
	let latest: ShoppingConversionEntry | undefined;

	for (const entry of Object.values(defaults)) {
		if (
			entry.nameKey === nameKey &&
			normalizeUnit(entry.unitLabel) === unit &&
			(!latest || entry.usedAt > latest.usedAt)
		) {
			latest = entry;
		}
	}

	return latest;
}

export type ConversionMemoryUpdate = {
	// 書く記憶（同じ中身があれば、その鍵のまま、使った時刻を新しくしたもの）。
	key: string;
	entry: ShoppingConversionEntry;
	// 消す記憶の鍵（その食材の記憶が、上限を超えた分。使った時刻の古いものから）。
	removedKeys: string[];
};

/**
 * 換算を覚えるときの、書く記憶と消す記憶を決める。食材名が空なら、覚えない（null）。
 * - 同じ食材・単位・換算の記憶があれば、数量と使った時刻を新しくする（数量がなければ、覚えた数量のまま）。なければ、新しい鍵で足す。
 * - その食材の記憶が上限を超えたら、使った時刻の古いものから消す（単位をまたいで数える）。
 */
export function planConversionMemoryUpdate(
	defaults: ShoppingConversionDefaults,
	itemName: string,
	value: ShoppingConversionMemoryValue,
	{ now, createKey }: { now: number; createKey: () => string },
): ConversionMemoryUpdate | null {
	const nameKey = toConversionDefaultKey(itemName);

	if (!nameKey) {
		return null;
	}

	const sameItem = Object.entries(defaults).filter(
		([, entry]) => entry.nameKey === nameKey,
	);
	const same = sameItem.find(([, entry]) =>
		isSameConversionDefault(entry, value),
	);
	const key = same?.[0] ?? createKey();
	const quantity = value.quantity ?? same?.[1].quantity;
	const entry: ShoppingConversionEntry = {
		unitLabel: value.unitLabel,
		inventoryConversion: value.inventoryConversion,
		...(quantity === undefined ? {} : { quantity }),
		nameKey,
		usedAt: now,
	};
	const removedKeys = sameItem
		.filter(([otherKey]) => otherKey !== key)
		.sort(([, a], [, b]) => b.usedAt - a.usedAt)
		.slice(maxConversionMemoriesPerItem - 1)
		.map(([otherKey]) => otherKey);

	return { key, entry, removedKeys };
}

// 食材のいつもの単位の記憶（その食材で、最後に使った単位）。
export function findUsualConversionDefault(
	defaults: ShoppingConversionDefaults,
	itemName: string,
): ShoppingConversionEntry | undefined {
	const nameKey = toConversionDefaultKey(itemName);

	if (!nameKey) {
		return undefined;
	}

	let latest: ShoppingConversionEntry | undefined;

	for (const entry of Object.values(defaults)) {
		if (
			entry.nameKey === nameKey &&
			(!latest || entry.usedAt > latest.usedAt)
		) {
			latest = entry;
		}
	}

	return latest;
}

// カタログの「一般的な売られ方」から作る、単位なしの行の既定（例：卵 → 1パック＝10個）。
export function catalogUsualConversion(
	itemName: string,
): (ShoppingConversionDefault & { isApproximate: boolean }) | undefined {
	const entry = findIngredientCatalogEntry(itemName);
	const usual = entry?.usualRetailUnit;

	if (!entry || !usual) {
		return undefined;
	}

	const isPresence = entry.defaultTrackingMode === "presence";

	return {
		unitLabel: usual.unitLabel,
		isApproximate: usual.approximate === true,
		inventoryConversion: {
			inputUnitCode: toInputUnitCode(usual.unitLabel),
			stockUnitCode: entry.stockUnitCode,
			stockUnitLabel: getDefaultStockUnitLabel(entry.stockUnitCode),
			// 有無だけで管理する食材は、量の換算がいらない。
			stockQuantityPerInputUnit: isPresence ? 1 : usual.quantity,
			trackingMode: entry.defaultTrackingMode,
			...(usual.approximate && !isPresence ? { isApproximate: true } : {}),
		},
	};
}

/**
 * 読み取った行に、記憶とカタログの既定を当てはめる。
 * - 単位のない行（数量なし、または単位のない数字）：⓪いつもの買い方（前回の単位と、その単位の換算の記憶。
 *   数量を書いていなければ、前回の数量も）→ ①食材のいつもの単位の記憶 → ②カタログの一般的な売られ方
 *   （量を追わない食材は、その単位で1つ）→ ③そのまま。数量は、書いたとおり（「牛乳 2」→ 2本）。
 * - 単位を書いた行：その単位の記憶があれば、記憶の換算を付ける。なければ、そのまま。
 */
export function applyConversionDefaults(
	lines: readonly ParsedShoppingMemoLine[],
	defaults: ShoppingConversionDefaults,
	itemMemories: ShoppingItemMemories = {},
): ParsedShoppingMemoLine[] {
	return lines.map((line) => {
		const nameKey = line.unitless ? toConversionDefaultKey(line.name) : null;
		const memory = nameKey ? itemMemories[nameKey] : undefined;

		if (memory) {
			const conversion = findConversionDefault(
				defaults,
				line.name,
				memory.unitLabel,
			);

			return {
				...line,
				// 数量も単位も書いていない行（unitLabel が null）は、前回の数量。
				quantity: line.unitLabel === null ? memory.quantity : line.quantity,
				unitLabel: memory.unitLabel,
				...(conversion
					? { inventoryConversion: conversion.inventoryConversion }
					: {}),
			};
		}

		if (line.unitless) {
			const fill =
				findUsualConversionDefault(defaults, line.name) ??
				catalogUsualConversion(line.name);

			return fill
				? {
						...line,
						unitLabel: fill.unitLabel,
						inventoryConversion: fill.inventoryConversion,
					}
				: line;
		}

		const remembered = findConversionDefault(
			defaults,
			line.name,
			line.unitLabel,
		);

		return remembered
			? { ...line, inventoryConversion: remembered.inventoryConversion }
			: line;
	});
}

// 記憶の内容を、人が読む形にする（例：1本＝1000ml。目安の換算は「約」を付ける。同じ単位の1対1は「gのまま」）。
export function describeConversionDefault(
	value: ShoppingConversionDefault,
): string {
	const conversion = value.inventoryConversion;

	if (conversion.trackingMode === "presence") {
		return "有無だけで管理";
	}

	if (isSameUnitConversion(conversion)) {
		return `${conversion.stockUnitLabel}のまま`;
	}

	const approx = conversion.isApproximate ? "約" : "";

	return `1${value.unitLabel ?? "つ"}＝${approx}${conversion.stockQuantityPerInputUnit}${conversion.stockUnitLabel}`;
}
