// リンク先として指定してよいレシピか（純粋な関数）。
// 公開範囲は、あとの段階（recipe.visibility）で、DB に入る。それまでは、すべて "private"（自分のレシピだけ）として扱う。

export type RecipeVisibility = "private" | "unlisted" | "public";

type LinkTarget = {
	ownerUserId: string;
	visibility: RecipeVisibility;
};

// 自分のレシピは、公開範囲に関わらず、リンクできる。他のユーザーのレシピは、公開されているもの（限定公開・全体公開）だけ。
export function canLinkToRecipe(
	viewerUserId: string,
	target: LinkTarget,
): boolean {
	return (
		target.ownerUserId === viewerUserId ||
		target.visibility === "unlisted" ||
		target.visibility === "public"
	);
}
