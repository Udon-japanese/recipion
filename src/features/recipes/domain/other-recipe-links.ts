// 他の人の全体公開レシピへのリンクの入力（[[@ユーザー/レシピ]]）に使う、純粋な関数。
import { foldIngredientSearchText } from "#/features/ingredients/domain/ingredient-catalog";
import { sanitizeLinkLabel } from "./recipe-links";

// リンクできる他のユーザー（全体公開のレシピを持つ人）。
export type LinkableUser = {
	handle: string;
	name: string;
};

// リンクできる他の人のレシピ。
export type OtherRecipeTarget = {
	publicId: string;
	name: string;
	// 登録した日時（ISO 8601）。
	createdAt: string;
	authorName: string;
	authorHandle: string;
};

// [[ のあとに打った文字の解釈。@ で始まらなければ、他の人のレシピの入力ではない（null）。
// @ユーザー名の途中 → users（ユーザーを探す）、@ハンドル/ のあと → recipes（そのユーザーのレシピを選ぶ）。
export type OtherLinkQuery =
	| { stage: "users"; query: string }
	| { stage: "recipes"; handle: string; query: string };

export function parseOtherLinkQuery(typed: string): OtherLinkQuery | null {
	// 日本語入力のまま打った全角の ＠ ／ も、同じに扱う。
	if (!typed.startsWith("@") && !typed.startsWith("＠")) {
		return null;
	}

	const rest = typed.slice(1);
	const slash = rest.search(/[/／]/u);

	if (slash < 0) {
		return { stage: "users", query: rest };
	}

	return {
		stage: "recipes",
		handle: rest.slice(0, slash),
		query: rest.slice(slash + 1),
	};
}

// カーソルが、閉じていない [[ の中にあるとき、[[ のあとに打った文字（カーソルの後ろの、]] の手前の文字も含める）。なければ null。
export function getOpenLinkTyped(text: string, caret: number): string | null {
	const lineStart = text.lastIndexOf("\n", caret - 1) + 1;
	const lineEndIndex = text.indexOf("\n", caret);
	const before = text.slice(lineStart, caret);
	const after = text.slice(
		caret,
		lineEndIndex < 0 ? text.length : lineEndIndex,
	);
	const open = before.lastIndexOf("[[");

	if (open < 0 || /[[\]\n]/u.test(before.slice(open + 2))) {
		return null;
	}

	const closed = after.match(/^([^[\]\n]*)\]\]/u);

	return `${before.slice(open + 2)}${closed?.[1] ?? ""}`;
}

// 本文に入れるラベル。「表示名の料理名」。自分のレシピと名前が衝突しないように、作者の名前を付ける。
export function makeOtherRecipeLabelBase(
	authorName: string,
	recipeName: string,
): string {
	return sanitizeLinkLabel(`${authorName}の${recipeName}`);
}

// ユーザーを、打った文字で絞る（ハンドル・表示名の前方一致。かな・全角半角を同じとみなす）。入力が空なら、すべて。
export function filterLinkableUsers(
	users: readonly LinkableUser[],
	query: string,
	limit: number,
): LinkableUser[] {
	const folded = foldIngredientSearchText(query.trim());

	if (folded === "") {
		return users.slice(0, limit);
	}

	return users
		.filter(
			(user) =>
				foldIngredientSearchText(user.handle).startsWith(folded) ||
				foldIngredientSearchText(user.name).startsWith(folded),
		)
		.slice(0, limit);
}

// そのユーザーのレシピを、打った文字で絞る（料理名の前方一致を先に、部分一致をあとに）。
export function filterOtherRecipes(
	recipes: readonly OtherRecipeTarget[],
	handle: string,
	query: string,
	limit: number,
): OtherRecipeTarget[] {
	const own = recipes.filter((recipe) => recipe.authorHandle === handle);
	const folded = foldIngredientSearchText(query.trim());

	if (folded === "") {
		return own.slice(0, limit);
	}

	const prefix: OtherRecipeTarget[] = [];
	const partial: OtherRecipeTarget[] = [];

	for (const recipe of own) {
		const name = foldIngredientSearchText(recipe.name);

		if (name.startsWith(folded)) {
			prefix.push(recipe);
		} else if (name.includes(folded)) {
			partial.push(recipe);
		}
	}

	return [...prefix, ...partial].slice(0, limit);
}
