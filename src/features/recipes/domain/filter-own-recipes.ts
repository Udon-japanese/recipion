import { parseRecipeSearchTerms } from "./public-recipe-search";
import {
	isPublicRecipeTag,
	normalizePersonalTag,
	type PublicRecipeTag,
	publicRecipeTagLabel,
	recipeTagLimits,
	sortPublicRecipeTags,
} from "./recipe-tags";

// 全角・半角をそろえ、大文字・小文字とカタカナ・ひらがなの違いをなくす（比べるためだけの形）。
function toComparable(text: string): string {
	return text
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[ァ-ヶ]/gu, (char) =>
			String.fromCharCode(char.charCodeAt(0) - 0x60),
		);
}

export type OwnRecipeTagFilter =
	| { kind: "public"; tag: PublicRecipeTag }
	| { kind: "personal"; tag: string };

// 一度に絞り込みに使えるタグの数（履歴に持つため、上限を決める）。
export const maxOwnRecipeTagFilters = 20;

export function isSameOwnRecipeTagFilter(
	a: OwnRecipeTagFilter,
	b: OwnRecipeTagFilter,
): boolean {
	return a.kind === b.kind && a.tag === b.tag;
}

// 履歴から読んだ絞り込みのタグを整える。語の一覧にない公開用のタグ、保存できない形の個人用のタグ、重なりは捨てる。
export function parseOwnRecipeTagFilters(
	values: readonly { kind: "public" | "personal"; tag: string }[],
): OwnRecipeTagFilter[] {
	const filters: OwnRecipeTagFilter[] = [];

	for (const { kind, tag } of values) {
		const filter = toOwnRecipeTagFilter(kind, tag);

		if (
			filter &&
			!filters.some((selected) => isSameOwnRecipeTagFilter(selected, filter))
		) {
			filters.push(filter);
		}
	}

	return filters.slice(0, maxOwnRecipeTagFilters);
}

function toOwnRecipeTagFilter(
	kind: "public" | "personal",
	tag: string,
): OwnRecipeTagFilter | null {
	if (kind === "public") {
		return isPublicRecipeTag(tag) ? { kind, tag } : null;
	}

	return normalizePersonalTag(tag) === tag &&
		[...tag].length <= recipeTagLimits.personalTagMaxLength
		? { kind, tag }
		: null;
}

type FilterableRecipe = {
	name: string;
	publicTags: readonly PublicRecipeTag[];
	personalTags: readonly string[];
};

function hasTag(recipe: FilterableRecipe, filter: OwnRecipeTagFilter): boolean {
	return filter.kind === "public"
		? recipe.publicTags.includes(filter.tag)
		: recipe.personalTags.includes(filter.tag);
}

// 自分のレシピを絞り込む（順番は変えない）。
// 検索語：空白で区切った語を、すべて含むものだけ。語は、名前かタグ（公開用は表示名）のどれかに当たればよい。
// タグ：選んだタグを、すべて持つものだけ。
export function filterOwnRecipes<T extends FilterableRecipe>(
	recipes: readonly T[],
	query: string,
	tagFilters: readonly OwnRecipeTagFilter[] = [],
): T[] {
	const terms = parseRecipeSearchTerms(query).map(toComparable);

	return recipes.filter((recipe) => {
		if (!tagFilters.every((filter) => hasTag(recipe, filter))) {
			return false;
		}

		if (terms.length === 0) {
			return true;
		}

		const texts = [
			recipe.name,
			...recipe.publicTags.map(publicRecipeTagLabel),
			...recipe.personalTags,
		].map(toComparable);

		return terms.every((term) => texts.some((text) => text.includes(term)));
	});
}

// 自分のレシピで使われているタグ（絞り込みのチップに並べる）。
// 公開用は語の一覧の順、個人用は、使っているレシピの多い順（同じ数なら、名前の順）。
export function collectOwnRecipeTags(recipes: readonly FilterableRecipe[]): {
	publicTags: PublicRecipeTag[];
	personalTags: string[];
} {
	const personalCounts = new Map<string, number>();

	for (const recipe of recipes) {
		for (const tag of recipe.personalTags) {
			personalCounts.set(tag, (personalCounts.get(tag) ?? 0) + 1);
		}
	}

	return {
		publicTags: sortPublicRecipeTags(
			recipes.flatMap((recipe) => recipe.publicTags),
		),
		personalTags: [...personalCounts]
			.sort(([a, aCount], [b, bCount]) =>
				aCount === bCount ? a.localeCompare(b, "ja") : bCount - aCount,
			)
			.map(([tag]) => tag),
	};
}
