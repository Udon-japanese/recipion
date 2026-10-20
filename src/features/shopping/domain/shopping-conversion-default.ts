import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "#/features/ingredients/domain/ingredient-catalog";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import { toInputUnitCode } from "./infer-inventory-conversion";
import type { ParsedShoppingMemoLine } from "./parse-shopping-memo";
import type { ShoppingItemInventoryConversion } from "./shopping-item";

// ユーザーが決めた在庫換算の記憶（食材×買う単位ごとに1つ）。
// 買う単位の呼び名（例：本）と、その1単位が在庫でいくつか（例：1本＝1000ml）の組。
export type ShoppingConversionDefault = {
	// 単位なしで決めたときは null。
	unitLabel: string | null;
	inventoryConversion: ShoppingItemInventoryConversion;
};

// 記憶1件。usedAt は最後に使った時刻（ミリ秒）。食材のいつもの単位は、最後に使った単位。
export type ShoppingConversionEntry = ShoppingConversionDefault & {
	nameKey: string;
	usedAt: number;
};

// 記憶のキー（食材名のキー＋単位のキー）→ 記憶。
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

// 記憶のキー（食材×単位）。
export function toConversionMemoryKey(
	nameKey: string,
	unitLabel: string | null,
): string {
	return `${nameKey}\t${normalizeUnit(unitLabel) ?? ""}`;
}

// 2つの記憶が、同じ内容か（上書きを確認するかどうかの判定に使う）。
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

// 食材名と単位に対する記憶（なければ undefined）。
export function findConversionDefault(
	defaults: ShoppingConversionDefaults,
	itemName: string,
	unitLabel: string | null,
): ShoppingConversionEntry | undefined {
	const nameKey = toConversionDefaultKey(itemName);

	return nameKey
		? defaults[toConversionMemoryKey(nameKey, unitLabel)]
		: undefined;
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
 * - 単位のない行（数量なし、または単位のない数字）：①食材のいつもの単位の記憶 → ②カタログの一般的な売られ方
 *   （量を追わない食材は、その単位で1つ）→ ③そのまま。数量は、書いたとおり（「牛乳 2」→ 2本）。
 * - 単位を書いた行：その単位の記憶があれば、記憶の換算を付ける。なければ、そのまま。
 */
export function applyConversionDefaults(
	lines: readonly ParsedShoppingMemoLine[],
	defaults: ShoppingConversionDefaults,
): ParsedShoppingMemoLine[] {
	return lines.map((line) => {
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

// 記憶の内容を、人が読む形にする（例：1本＝1000ml。目安の換算は「約」を付ける）。
export function describeConversionDefault(
	value: ShoppingConversionDefault,
): string {
	const conversion = value.inventoryConversion;

	if (conversion.trackingMode === "presence") {
		return "有無だけで管理";
	}

	const approx = conversion.isApproximate ? "約" : "";

	return `1${value.unitLabel ?? "つ"}＝${approx}${conversion.stockQuantityPerInputUnit}${conversion.stockUnitLabel}`;
}
