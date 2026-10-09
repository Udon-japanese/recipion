import { foldIngredientSearchText } from "#/features/ingredients/domain/ingredient-catalog";
import type { RecipeLinkTarget } from "./recipe-links";

// リンクの候補を、入力した文字で絞る（ひらがな・カタカナ・全角・半角を、同じとみなす）。前方一致を先に、部分一致をそのあとに並べる。入力が空なら、すべて（元の順）。
export function filterLinkTargets(
	targets: readonly RecipeLinkTarget[],
	query: string,
	limit: number,
): RecipeLinkTarget[] {
	const folded = foldIngredientSearchText(query.trim());

	if (folded === "") {
		return targets.slice(0, limit);
	}

	const prefix: RecipeLinkTarget[] = [];
	const partial: RecipeLinkTarget[] = [];

	for (const target of targets) {
		const name = foldIngredientSearchText(target.name);

		if (name.startsWith(folded)) {
			prefix.push(target);
		} else if (name.includes(folded)) {
			partial.push(target);
		}
	}

	return [...prefix, ...partial].slice(0, limit);
}
