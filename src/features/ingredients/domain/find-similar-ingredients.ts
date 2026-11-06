import {
	findIngredientCatalogEntry,
	foldIngredientSearchText,
	ingredientCatalogEntries,
} from "./ingredient-catalog";
import type { IngredientDictionary } from "./ingredient-dictionary";

// 「もしかして」の候補。name は、今ある材料の代表の名前（カタログの名前か、自分の材料の名前）。
export type SimilarIngredient = {
	name: string;
	// 自分の材料（辞書の材料）か。
	isOwn: boolean;
};

const maxSuggestions = 3;
// 「含む」とみなす、短い方の最小の文字数（1文字だと、ほとんどの名前に当たるため）。
const minContainedLength = 2;
// 「1文字違い」とみなす、最小の文字数。
const minTypoLength = 3;

// 比べる名前が、入力とどれだけ近いか（0：そろえると同じ／1：どちらかが含む／2：1文字違い／Infinity：似ていない）。
function rankSimilarity(folded: string, candidate: string): number {
	if (candidate === folded) {
		return 0;
	}

	const shorter = Math.min(candidate.length, folded.length);

	if (
		shorter >= minContainedLength &&
		(candidate.includes(folded) || folded.includes(candidate))
	) {
		return 1;
	}

	if (shorter >= minTypoLength && isOneEditApart(folded, candidate)) {
		return 2;
	}

	return Number.POSITIVE_INFINITY;
}

// 1文字の置き換え・足し・消しで、同じになるか。
function isOneEditApart(left: string, right: string): boolean {
	const a = [...left];
	const b = [...right];

	if (Math.abs(a.length - b.length) > 1) {
		return false;
	}

	let i = 0;
	let j = 0;
	let edits = 0;

	while (i < a.length && j < b.length) {
		if (a[i] === b[j]) {
			i += 1;
			j += 1;
			continue;
		}

		edits += 1;

		if (edits > 1) {
			return false;
		}

		if (a.length > b.length) {
			i += 1;
		} else if (b.length > a.length) {
			j += 1;
		} else {
			i += 1;
			j += 1;
		}
	}

	return edits + (a.length - i) + (b.length - j) <= 1;
}

function bestRank(folded: string, names: readonly string[]): number {
	return Math.min(
		...names.map((name) =>
			rankSimilarity(folded, foldIngredientSearchText(name)),
		),
	);
}

// 知らない名前（カタログにも、自分の辞書にもない）に、似ている材料を、近い順に返す。知っている名前・空は、何も返さない。
// 近さが同じなら、自分の材料を先に（その人の言葉なので）。
export function findSimilarIngredients(
	name: string,
	dictionary?: IngredientDictionary,
): SimilarIngredient[] {
	const folded = foldIngredientSearchText(name);

	if (
		folded === "" ||
		findIngredientCatalogEntry(name) !== undefined ||
		dictionary?.findCanonicalName(name) !== undefined
	) {
		return [];
	}

	const ranked: (SimilarIngredient & { rank: number })[] = [];

	for (const entry of dictionary?.entries ?? []) {
		const rank = bestRank(folded, [entry.name, ...entry.aliases]);

		if (Number.isFinite(rank)) {
			ranked.push({ name: entry.name, isOwn: true, rank });
		}
	}

	for (const entry of ingredientCatalogEntries) {
		const rank = bestRank(folded, [
			entry.name,
			...entry.aliases,
			...(entry.reading ? [entry.reading] : []),
		]);

		if (Number.isFinite(rank)) {
			ranked.push({ name: entry.name, isOwn: false, rank });
		}
	}

	const seen = new Set<string>();

	// sort は安定なので、同じ近さでは、自分の材料 → カタログの順のまま。
	return ranked
		.sort((a, b) => a.rank - b.rank)
		.filter((candidate) => {
			if (seen.has(candidate.name)) {
				return false;
			}

			seen.add(candidate.name);

			return true;
		})
		.slice(0, maxSuggestions)
		.map(({ name: candidateName, isOwn }) => ({ name: candidateName, isOwn }));
}
