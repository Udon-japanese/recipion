import * as v from "valibot";

const ingredientNameSchema = v.pipe(
	v.string(),
	v.transform((name) => name.normalize("NFKC")),
	v.trim(),
	v.minLength(1, "食材名を入力してください"),
	v.transform((name) => name.replace(/\s+/gu, " ")),
);

export function formatIngredientName(name: string): string {
	return v.parse(ingredientNameSchema, name);
}

// カタカナ（ァ〜ヶ）を、対応するひらがなにする（「ベーコン」と「べーコン」のように、見分けにくい違いをそろえる）。
// DB の ingredient_alias.normalized_name も、この規則でそろえる（マイグレーション 0013 の translate と同じ範囲）。
export function foldKatakanaToHiragana(text: string): string {
	return text.replace(/[\u30a1-\u30f6]/gu, (character) =>
		String.fromCharCode(character.charCodeAt(0) - 0x60),
	);
}

// 照合に使う名前：NFKC・前後の空白・連続する空白・大文字小文字・ひらがなとカタカナの違いをそろえる。
export function normalizeIngredientName(name: string): string {
	return foldKatakanaToHiragana(
		formatIngredientName(name).toLocaleLowerCase("ja-JP"),
	);
}
