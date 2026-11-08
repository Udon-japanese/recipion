import { convertAmountToStockQuantity } from "#/features/ingredients/domain/convert-to-stock-quantity";
import {
	findIngredientCatalogEntry,
	getFixedShapeStandInCatalogEntryIds,
	getStandInCatalogEntryIds,
} from "#/features/ingredients/domain/ingredient-catalog";
import type { AlternateAmount } from "#/features/ingredients/domain/parse-ingredient-line";
import type { InventoryTrackingMode } from "#/features/inventory/domain/inventory-tracking-mode";
import type { InventoryUnitCode } from "#/features/inventory/domain/inventory-unit";

// 冷凍野菜を、生の野菜の代わりに使うかの設定。
// auto: 形が自由なもの（冷凍ブロッコリーなど）は自動で使い、形が決まっているもの（冷凍玉ねぎ(みじん切り)など）は毎回選ぶ。
// ask: どれも毎回選ぶ。off: 代わりに使わない（判定に入れない）。
export type StandInMode = "auto" | "ask" | "off";

export const standInModes: readonly StandInMode[] = ["auto", "ask", "off"];

export type StandInStockItem = {
	name: string;
	quantity: number;
	stockUnitCode: InventoryUnitCode;
	stockUnitLabel: string;
	trackingMode?: InventoryTrackingMode;
	sourceRecipePublicId?: string;
};

export type StandInNeed = {
	name: string;
	quantity: number | null;
	unitLabel: string | null;
	// 分量の言い換え（「1株(250g)」の 250g）。
	alternate?: AlternateAmount | null;
};

export type StandInCandidate<T> = {
	item: T;
	// 使える在庫の量（在庫の単位）。
	available: number;
	// 必要な量（在庫の単位）。材料に量がない（少々・適量）か、有無だけの食材なら null。
	required: number | null;
};

export type StandInCandidates<T> = {
	// 自動で代わりに使うもの。
	auto: StandInCandidate<T>[];
	// 使うかどうかを、本人が選ぶもの。
	ask: StandInCandidate<T>[];
};

function round(value: number): number {
	return Number(value.toFixed(6));
}

// 代わりの食材の在庫だけで、必要な量を満たすときの候補。満たさない・確かめられない（換算できない）ときは undefined。
function toSufficientCandidate<T extends StandInStockItem>(
	need: StandInNeed,
	item: T,
	available: number,
): StandInCandidate<T> | undefined {
	if (available <= 0) {
		return undefined;
	}

	if (need.quantity === null || item.trackingMode === "presence") {
		return { item, available, required: null };
	}

	// 単位が違う（レシピは「1個」、冷凍は g）ときは、生の食材の重さで換算する。
	const required = convertAmountToStockQuantity(
		need,
		item,
		findIngredientCatalogEntry(need.name),
	);

	return required !== null && available >= required
		? { item, available, required: round(required) }
		: undefined;
}

/**
 * 材料の代わりに使える在庫（冷凍野菜など）のうち、それだけで必要な量を満たすものを、設定に合わせて分ける。
 * 量を満たさないもの・換算できないものは、どちらにも入れない（「在庫があります」とも知らせない）。
 * availableOf は、同じ食材を複数の行で使うときの、残りの量（省略は在庫の量）。
 */
export function findStandInCandidates<T extends StandInStockItem>(
	need: StandInNeed,
	stockItems: readonly T[],
	mode: StandInMode,
	availableOf: (item: T) => number = (item) => item.quantity,
): StandInCandidates<T> {
	if (mode === "off") {
		return { auto: [], ask: [] };
	}

	const collect = (ids: ReadonlySet<string>) =>
		ids.size === 0
			? []
			: stockItems.flatMap((item) => {
					const id = findIngredientCatalogEntry(item.name)?.id;

					if (
						item.sourceRecipePublicId !== undefined ||
						id === undefined ||
						!ids.has(id)
					) {
						return [];
					}

					const candidate = toSufficientCandidate(
						need,
						item,
						availableOf(item),
					);

					return candidate ? [candidate] : [];
				});

	const freeShape = collect(getStandInCatalogEntryIds(need.name));
	const fixedShape = collect(getFixedShapeStandInCatalogEntryIds(need.name));

	return mode === "auto"
		? { auto: freeShape, ask: fixedShape }
		: { auto: [], ask: [...freeShape, ...fixedShape] };
}
