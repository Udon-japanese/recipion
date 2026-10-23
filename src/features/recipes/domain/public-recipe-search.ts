// 全体公開のレシピの一覧・検索に使う、純粋な関数と型。

export type PublicRecipeSummary = {
	publicId: string;
	name: string;
	servings: number;
	ingredientCount: number;
	// 登録した日時（ISO 8601）。
	createdAt: string;
	authorName: string;
	authorHandle: string;
};

export type PublicRecipePage = {
	recipes: PublicRecipeSummary[];
	// 続きがあるときだけ入る（次のページを取るときに、そのまま渡す）。
	nextCursor: string | null;
};

export const publicRecipePageSize = 20;
export const maxSearchTerms = 4;
export const maxSearchTermLength = 30;
export const maxSearchQueryLength = 100;

// 検索語：全角・半角をそろえ、空白で区切る（上限あり。同じ語は1つ）。
export function parseRecipeSearchTerms(query: string): string[] {
	const terms = query
		.normalize("NFKC")
		.split(/\s+/u)
		.map((term) => term.slice(0, maxSearchTermLength))
		.filter((term) => term.length > 0);

	return [...new Set(terms)].slice(0, maxSearchTerms);
}

// LIKE の特殊文字（% _ \）を、そのままの文字として扱う。
function escapeLike(text: string): string {
	return text.replace(/[\\%_]/gu, (char) => `\\${char}`);
}

function convertKana(text: string, offset: number, from: RegExp): string {
	return text.replace(from, (char) =>
		String.fromCharCode(char.charCodeAt(0) + offset),
	);
}

// 1つの検索語の、部分一致のパターン。ひらがなとカタカナは、どちらの形でも探す。
export function buildLikePatterns(term: string): string[] {
	const hiragana = convertKana(term, -0x60, /[ァ-ヶ]/gu);
	const katakana = convertKana(term, 0x60, /[ぁ-ゖ]/gu);

	return [...new Set([term, hiragana, katakana])].map(
		(variant) => `%${escapeLike(variant)}%`,
	);
}

// 続きの取り方：「登録日時|公開 ID」（登録日時は、データベースが返した文字のまま。精度を落とさないため）。
const cursorPattern =
	/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?[+-]\d{2}(?::\d{2})?)\|([A-Za-z0-9_-]{1,64})$/u;

export type SearchCursor = { createdAt: string; publicId: string };

export function formatSearchCursor(cursor: SearchCursor): string {
	return `${cursor.createdAt}|${cursor.publicId}`;
}

export function parseSearchCursor(value: string): SearchCursor | null {
	const match = value.match(cursorPattern);

	return match ? { createdAt: match[1], publicId: match[2] } : null;
}
