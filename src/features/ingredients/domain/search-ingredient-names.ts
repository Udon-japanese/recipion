import {
	findIngredientCatalogEntry,
	foldIngredientSearchText,
	type IngredientCatalogEntry,
	rankFoldedSearchNames,
	rankIngredientCatalog,
} from "./ingredient-catalog";
import type { IngredientDictionary } from "./ingredient-dictionary";

// 材料名の候補。カタログの食材（entry あり）か、自分の材料（カタログにない、辞書の食材）。
export type IngredientSuggestion = {
	key: string;
	// 入れる名前（辞書の呼び名で当たったときも、代表の名前）。
	name: string;
	entry: IngredientCatalogEntry | undefined;
	// 自分の材料（カタログにない）か。候補に「自分の材料」と出す。
	isOwn: boolean;
};

/**
 * 入力に合う材料名を、近い順に返す（カタログ＋自分の食材辞書）。
 * - 近さは、カタログと同じ（完全一致 → 前方一致 → 部分一致）。同じ近さでは、自分の材料を先に。
 * - 辞書の食材がカタログの食材なら、カタログの候補として1つにまとめる（自分で足した呼び名でも、その食材が出る）。
 */
export function searchIngredientNames(
	query: string,
	dictionary?: IngredientDictionary,
	// 返す数の上限（省くと、すべて）。
	limit = Number.POSITIVE_INFINITY,
): IngredientSuggestion[] {
	const foldedQuery = foldIngredientSearchText(query);

	if (foldedQuery.length === 0) {
		return [];
	}

	const ranked: (IngredientSuggestion & { rank: number })[] = [];

	for (const dictionaryEntry of dictionary?.entries ?? []) {
		const rank = rankFoldedSearchNames(
			[dictionaryEntry.name, ...dictionaryEntry.aliases].map(
				foldIngredientSearchText,
			),
			foldedQuery,
		);

		if (!Number.isFinite(rank)) {
			continue;
		}

		const entry = findIngredientCatalogEntry(dictionaryEntry.name);

		ranked.push(
			entry
				? { key: entry.id, name: entry.name, entry, isOwn: false, rank }
				: {
						key: `own:${dictionaryEntry.id}`,
						name: dictionaryEntry.name,
						entry: undefined,
						isOwn: true,
						rank,
					},
		);
	}

	for (const { entry, rank } of rankIngredientCatalog(query)) {
		ranked.push({ key: entry.id, name: entry.name, entry, isOwn: false, rank });
	}

	// 同じ候補は、いちばん近いものを残す（sort は安定なので、同じ近さでは、辞書の候補が先）。
	const seen = new Set<string>();

	return ranked
		.sort((a, b) => a.rank - b.rank)
		.filter((suggestion) => {
			if (seen.has(suggestion.key)) {
				return false;
			}

			seen.add(suggestion.key);

			return true;
		})
		.slice(0, limit)
		.map(({ rank: _rank, ...suggestion }) => suggestion);
}
