// リンク先として指定してよいレシピか（純粋な関数）。
// 公開範囲は、DB の recipe.visibility。

export type RecipeVisibility = "private" | "unlisted" | "public";

// DB の値を、公開範囲にする。知らない値は、最も狭い "private" として扱う（誤って公開しない）。
export function parseRecipeVisibility(value: string): RecipeVisibility {
	return value === "unlisted" || value === "public" ? value : "private";
}

type LinkTarget = {
	ownerUserId: string;
	visibility: RecipeVisibility;
};

// 自分のレシピは、公開範囲に関わらず、リンクできる。他のユーザーのレシピは、全体公開のものだけ
// （限定公開は、パスフレーズを知らない人にも、名前やリンクが見えてしまうため、リンクの対象にしない）。
export function canLinkToRecipe(
	viewerUserId: string,
	target: LinkTarget,
): boolean {
	return target.ownerUserId === viewerUserId || target.visibility === "public";
}
