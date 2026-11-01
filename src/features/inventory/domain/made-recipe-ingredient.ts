// 「作った」で入れるできあがり（作り置き）の、在庫の単位の呼び名。数量は、レシピ1回分が 1。
export const madeRecipeUnitLabel = "回分";

// できあがりの食材の別名（内部用。利用者が打ち込む名前とぶつからない）。
export function madeRecipeAliasKey(recipePublicId: string): string {
	return `recipe:${recipePublicId}`;
}
