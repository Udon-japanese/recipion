import type { ShoppingCategoryId } from "#/features/shopping/domain/shopping-category";
import { ingredientCatalogEntries } from "./ingredient-catalog-data/index";
import { normalizeIngredientName } from "./normalize-ingredient-name";

export type IngredientStockUnitCode = "count" | "g" | "ml";

// 「個」「本」などの数え方ごとの重さ。サイズが分かれる食材だけ、size を付ける。
export type IngredientUnitWeight = {
	unit: string;
	size?: "小" | "中" | "大";
	grams: number;
	// 個体差が大きい目安のとき true。表示で「約」を付ける。
	approximate: boolean;
};

// 買うときの、よく使う数量（買い物メモの「よく使う数量」と、在庫の登録で使う）。
// inventoryConversion は、買った単位を、在庫の単位へ換算するための設定。
export type IngredientPurchasePreset = {
	label: string;
	quantity: number;
	unitLabel: string;
	inventoryConversion: {
		inputUnitCode: string;
		stockUnitCode: IngredientStockUnitCode;
		stockUnitLabel: string;
		stockQuantityPerInputUnit: number;
		trackingMode: "exact" | "estimated";
	};
};

const defaultStockUnitLabels: Record<IngredientStockUnitCode, string> = {
	count: "個",
	g: "g",
	ml: "ml",
};

export function getDefaultStockUnitLabel(
	stockUnitCode: IngredientStockUnitCode,
): string {
	return defaultStockUnitLabels[stockUnitCode];
}

// 食材の期限の目安（食材のカタログの expiry）。値の意味は、ingredient-catalog-data/expiry.ts を参照。
export type IngredientExpiryInfo = {
	kind: "use-by" | "best-before" | "none";
	defaultStorage: "room" | "fridge" | "freezer";
	hasPrintedDate: boolean;
	typicalRemainingDays: number | null;
	shelfLifeDays: { room?: number; fridge?: number; freezer?: number };
};

export type IngredientCatalogEntry = {
	id: string;
	name: string;
	aliases: readonly string[];
	// 在庫を登録するときの初期値（在庫の単位と管理方法）。
	stockUnitCode: IngredientStockUnitCode;
	defaultTrackingMode: "exact" | "estimated";
	// 個数→重量（例：玉ねぎ 中1個 → 約200g）。
	unitWeights?: readonly IngredientUnitWeight[];
	// 密度。大さじ・小さじ・カップ（体積）と、重さ（g）の換算に使う。
	density?: {
		gramsPerMl: number;
		approximate: boolean;
	};
	// 買い物メモでの売り場（カテゴリの自動判定に使う）。
	categoryId?: ShoppingCategoryId;
	// 買うときの、よく使う数量。ある食材は、登録のとき、在庫の単位と管理方法をカタログに固定する
	// （換算のプリセットと、在庫の単位がずれて、数量が狂うのを防ぐため）。
	presets?: readonly IngredientPurchasePreset[];
	// 期限の種類・初期の保存方法・目安の日数。
	expiry?: IngredientExpiryInfo;
	// 将来の「材料の説明」の置き場所。
	description?: string;
};

const entriesByNormalizedAlias = new Map<string, IngredientCatalogEntry>();

for (const entry of ingredientCatalogEntries) {
	for (const alias of [entry.name, ...entry.aliases]) {
		const normalizedAlias = normalizeIngredientName(alias);

		// 別名が重複したときは、先に書いた食材を優先する（重複は、テストで検出する）。
		if (!entriesByNormalizedAlias.has(normalizedAlias)) {
			entriesByNormalizedAlias.set(normalizedAlias, entry);
		}
	}
}

export function findIngredientCatalogEntry(
	name: string,
): IngredientCatalogEntry | undefined {
	if (name.trim().length === 0) {
		return undefined;
	}

	return entriesByNormalizedAlias.get(normalizeIngredientName(name));
}

// 検索用に、ひらがな・カタカナの違い、全角半角、大文字小文字、空白を吸収する。
function foldForSearch(text: string): string {
	return text
		.normalize("NFKC")
		.toLocaleLowerCase("ja-JP")
		.replace(/\s+/gu, "")
		.replace(/[\u30a1-\u30f6]/gu, (character) =>
			String.fromCharCode(character.charCodeAt(0) - 0x60),
		);
}

const searchIndex = ingredientCatalogEntries.map((entry) => ({
	entry,
	names: [entry.name, ...entry.aliases].map(foldForSearch),
}));

/**
 * 入力した文字に合う食材を、近い順に返す（名前の候補表示用）。
 * 完全一致 → 前方一致 → 部分一致の順。同じ順位では、カタログに書いた順。
 */
export function searchIngredientCatalog(
	query: string,
	limit = 8,
): IngredientCatalogEntry[] {
	const foldedQuery = foldForSearch(query);

	if (foldedQuery.length === 0) {
		return [];
	}

	const ranked: { entry: IngredientCatalogEntry; rank: number }[] = [];

	for (const { entry, names } of searchIndex) {
		let rank = Number.POSITIVE_INFINITY;

		for (const name of names) {
			if (name === foldedQuery) {
				rank = Math.min(rank, 0);
			} else if (name.startsWith(foldedQuery)) {
				rank = Math.min(rank, 1);
			} else if (name.includes(foldedQuery)) {
				rank = Math.min(rank, 2);
			}
		}

		if (Number.isFinite(rank)) {
			ranked.push({ entry, rank });
		}
	}

	// sort は安定なので、同じ順位は、カタログの順のまま。
	return ranked
		.sort((a, b) => a.rank - b.rank)
		.slice(0, limit)
		.map(({ entry }) => entry);
}

export { ingredientCatalogEntries };
