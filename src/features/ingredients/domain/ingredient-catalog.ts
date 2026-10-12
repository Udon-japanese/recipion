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
	// 読み仮名（ひらがな）。ひらがなを入力した時点で、漢字の食材も、候補に出すために使う。
	reading?: string;
	// 期限の種類・初期の保存方法・目安の日数。
	expiry?: IngredientExpiryInfo;
	// この食材が、代わりに使える、別の食材の名前（冷凍野菜が、生の野菜の代わりになる）。
	// レシピの材料が「玉ねぎ」のとき、在庫の「冷凍玉ねぎ」で足りているとみなすために使う。
	standsFor?: readonly string[];
	// 形（切り方）が決まっている代わりの食材（冷凍玉ねぎ(みじん切り)、冷凍なす(乱切り)など）。true のものは、
	// 料理によって合わないことがあるので、自動では代わりにしない（買い物の判定でも、「作った」で引くときも、
	// 「在庫があります」と知らせるだけにして、使うかどうかは、本人が選ぶ）。
	fixedShape?: boolean;
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

// 代わりになる食材の索引：代わりに使われる食材の名前（と、そのカタログの食材の ID）→ 代わりになる食材の ID。
const standInIdsByKey = new Map<string, Set<string>>();

for (const entry of ingredientCatalogEntries) {
	for (const standsForName of entry.standsFor ?? []) {
		const keys = [
			`name:${normalizeIngredientName(standsForName)}`,
			...(() => {
				const freshId = findIngredientCatalogEntry(standsForName)?.id;

				return freshId ? [`id:${freshId}`] : [];
			})(),
		];

		for (const key of keys) {
			const ids = standInIdsByKey.get(key) ?? new Set<string>();

			ids.add(entry.id);
			standInIdsByKey.set(key, ids);
		}
	}
}

// 材料の名前に対して、代わりに使える食材（形が決まっているものも含む）の ID を集める。
function collectStandInCatalogEntryIds(
	ingredientName: string,
): ReadonlySet<string> {
	const ids = new Set<string>();
	const freshId = findIngredientCatalogEntry(ingredientName)?.id;

	for (const key of [
		`name:${normalizeIngredientName(ingredientName)}`,
		...(freshId ? [`id:${freshId}`] : []),
	]) {
		for (const id of standInIdsByKey.get(key) ?? []) {
			ids.add(id);
		}
	}

	return ids;
}

const fixedShapeEntryIds = new Set(
	ingredientCatalogEntries
		.filter((entry) => entry.fixedShape)
		.map((entry) => entry.id),
);

function filterByShape(
	ids: ReadonlySet<string>,
	fixedShape: boolean,
): ReadonlySet<string> {
	return new Set(
		[...ids].filter((id) => fixedShapeEntryIds.has(id) === fixedShape),
	);
}

/**
 * 材料の名前に対して、自動で代わりにしてよい食材（冷凍ブロッコリーなど、形が自由なもの）の ID を返す。
 * 名前が同じ、または、同じカタログの食材（別名）を指すものを、まとめて探す。
 */
export function getStandInCatalogEntryIds(
	ingredientName: string,
): ReadonlySet<string> {
	return filterByShape(collectStandInCatalogEntryIds(ingredientName), false);
}

/**
 * 材料の名前に対して、形が決まっている代わりの食材（冷凍玉ねぎ(みじん切り)など）の ID を返す。
 * 自動では代わりにしない。「在庫があります」と知らせ、使うかどうかを、本人が選ぶために使う。
 */
export function getFixedShapeStandInCatalogEntryIds(
	ingredientName: string,
): ReadonlySet<string> {
	return filterByShape(collectStandInCatalogEntryIds(ingredientName), true);
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

export function foldIngredientSearchText(text: string): string {
	return foldForSearch(text);
}

// 検索の対象：名前、別名、読み仮名（ひらがな）。
const searchIndex = ingredientCatalogEntries.map((entry) => ({
	entry,
	names: [
		entry.name,
		...entry.aliases,
		...(entry.reading ? [entry.reading] : []),
	].map(foldForSearch),
}));

// カタログにある食材なら、名前・別名・読み仮名（検索用にそろえたもの）。なければ空。
export function listIngredientSearchTerms(name: string): string[] {
	const entry = findIngredientCatalogEntry(name);

	if (!entry) {
		return [];
	}

	return [
		entry.name,
		...entry.aliases,
		...(entry.reading ? [entry.reading] : []),
	].map(foldForSearch);
}

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
