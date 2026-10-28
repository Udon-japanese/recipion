import { parseRecipeSearchTerms } from "./public-recipe-search";

// 全角・半角をそろえ、大文字・小文字とカタカナ・ひらがなの違いをなくす（比べるためだけの形）。
function toComparable(text: string): string {
	return text
		.normalize("NFKC")
		.toLowerCase()
		.replace(/[ァ-ヶ]/gu, (char) =>
			String.fromCharCode(char.charCodeAt(0) - 0x60),
		);
}

// 自分のレシピを、名前で絞り込む。空白で区切った語を、すべて含むものだけ（順番は変えない）。
export function filterRecipesByName<T extends { name: string }>(
	recipes: readonly T[],
	query: string,
): T[] {
	const terms = parseRecipeSearchTerms(query).map(toComparable);

	if (terms.length === 0) {
		return [...recipes];
	}

	return recipes.filter((recipe) => {
		const name = toComparable(recipe.name);

		return terms.every((term) => name.includes(term));
	});
}
