import * as v from "valibot";
import {
	maxOwnRecipeTagFilters,
	type OwnRecipeTagFilter,
	parseOwnRecipeTagFilters,
} from "./filter-own-recipes";
import { maxSearchQueryLength, parseSearchTags } from "./public-recipe-search";
import type { PublicRecipeTag } from "./recipe-tags";

// レシピの検索の条件のうち、履歴（history state）に持つもの。
// 履歴は、そのタブの中だけにあり、URL に出ず、サーバーにも送られない。
// 同じタブで別の人がログインしたときに引き継がないよう、どれも持ち主（userId）を添えて保存する。

// 自分のレシピの検索の条件（検索語と、絞り込みのタグ）。個人用のタグを含むため、URL には出さない。
export type OwnRecipeSearch = {
	query: string;
	tagFilters: OwnRecipeTagFilter[];
};

export type StoredOwnRecipeSearch = OwnRecipeSearch & { userId: string };

export const emptyOwnRecipeSearch: OwnRecipeSearch = {
	query: "",
	tagFilters: [],
};

// みんなのレシピで、最後に探した条件。条件そのものは URL（q・tags）に持ち、
// 自分のレシピなどへ移ったあと、切り替えで戻ってきたときに、URL へ戻すためだけに履歴へ写す。
export type PublicRecipeSearch = {
	query: string;
	tags: PublicRecipeTag[];
};

export type StoredPublicRecipeSearch = PublicRecipeSearch & { userId: string };

const queryField = v.pipe(v.string(), v.maxLength(maxSearchQueryLength));

const storedOwnRecipeSearchSchema = v.object({
	userId: v.string(),
	query: queryField,
	tagFilters: v.pipe(
		v.array(
			v.object({
				kind: v.picklist(["public", "personal"]),
				tag: v.string(),
			}),
		),
		v.maxLength(maxOwnRecipeTagFilters),
	),
});

const storedPublicRecipeSearchSchema = v.object({
	userId: v.string(),
	query: queryField,
	tags: v.pipe(v.array(v.string()), v.maxLength(20)),
});

// 履歴に残っていた、自分のレシピの条件を読む。形が違う、または、いまの人のものでなければ、条件なし。
export function readOwnRecipeSearch(
	stored: unknown,
	userId: string | null,
): OwnRecipeSearch {
	const result = v.safeParse(storedOwnRecipeSearchSchema, stored);

	if (!result.success || !isOwnedBy(result.output, userId)) {
		return emptyOwnRecipeSearch;
	}

	return {
		query: result.output.query,
		tagFilters: parseOwnRecipeTagFilters(result.output.tagFilters),
	};
}

// 履歴に残っていた、みんなのレシピの最後の条件を読む。なければ（読めなければ）null。
export function readPublicRecipeSearch(
	stored: unknown,
	userId: string | null,
): PublicRecipeSearch | null {
	const result = v.safeParse(storedPublicRecipeSearchSchema, stored);

	if (!result.success || !isOwnedBy(result.output, userId)) {
		return null;
	}

	return {
		query: result.output.query,
		tags: parseSearchTags(result.output.tags),
	};
}

function isOwnedBy(stored: { userId: string }, userId: string | null): boolean {
	return userId !== null && stored.userId === userId;
}
