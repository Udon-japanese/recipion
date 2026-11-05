import type { RecipeShoppingNeed } from "./plan-shopping-from-recipe";
import { type RecipeLinkView, splitTextByLinks } from "./recipe-links";
import { normalizeYieldUnit, parseRecipeYield } from "./recipe-yield";

// 材料の名前の [[ラベル]] を、買い物メモの材料に直す。
// - 名前が [[ラベル]] だけで、リンク先が見つかる：他のレシピで作るもの（linkedRecipe）。そのレシピの材料を、展開して使う。
// - 名前が [[ラベル]] だけで、リンク先が見つからない（削除された・見られない）：買い物の候補にしない。
// - リンク先を決めていない [[ラベル]]、文章の途中にある [[ラベル]]：ふつうの材料として、ラベル（またはリンク先の名前）を名前にする（括弧は除く）。
export function resolveIngredientLinks(
	needs: readonly RecipeShoppingNeed[],
	linkViews: readonly RecipeLinkView[],
): RecipeShoppingNeed[] {
	return needs.flatMap((need) => {
		const segments = splitTextByLinks(need.name);

		if (!segments.some((segment) => segment.type === "link")) {
			return [need];
		}

		const [only] = segments;

		if (segments.length === 1 && only.type === "link") {
			const view = linkViews.find(
				(candidate) => candidate.label === only.label,
			);

			if (view && !view.target) {
				return [];
			}

			if (view?.target) {
				return [
					{
						...need,
						name: view.target.name,
						linkedRecipe: view.target,
					},
				];
			}
		}

		const name = segments
			.map((segment) =>
				segment.type === "text"
					? segment.text
					: (linkViews.find((view) => view.label === segment.label)?.target
							?.name ?? segment.label),
			)
			.join("")
			.replace(/\s+/gu, " ")
			.trim();

		return [name === "" ? need : { ...need, name }];
	});
}

// リンク先のレシピの、何回分を使うか（割合）。
// - 単位のない分数、「量」「倍」：その数（半分＝0.5、2倍＝2）
// - リンク先のできあがりと同じ単位（「人分」「個」など。最後の「分」は比べない）：数÷リンク先のできあがりの数
// - 数量がない、ほかの単位（g など。リンク先のできあがりの量が分からない）、リンク先が増減できない：1回分
export function linkedRecipeRatio(
	need: Pick<RecipeShoppingNeed, "quantity" | "unitLabel">,
	targetYieldText: string,
): number {
	const { quantity, unitLabel } = need;

	if (quantity === null || !Number.isFinite(quantity) || quantity <= 0) {
		return 1;
	}

	if (unitLabel === null || unitLabel === "量" || unitLabel === "倍") {
		return quantity;
	}

	const targetYield = parseRecipeYield(targetYieldText);

	if (
		targetYield &&
		normalizeYieldUnit(unitLabel) === normalizeYieldUnit(targetYield.suffix)
	) {
		return quantity / targetYield.quantity;
	}

	return 1;
}

// 名前が [[ラベル]] だけの材料のうち、リンク先が見つからない（削除された・見られない）もののラベル。
// resolveIngredientLinks は、これらを買い物の候補から外す。外したことを、画面で知らせるために使う。
export function findMissingIngredientLinks(
	needs: readonly Pick<RecipeShoppingNeed, "name">[],
	linkViews: readonly RecipeLinkView[],
): string[] {
	return needs.flatMap((need) => {
		const segments = splitTextByLinks(need.name);
		const [only] = segments;

		if (segments.length !== 1 || only.type !== "link") {
			return [];
		}

		const view = linkViews.find((candidate) => candidate.label === only.label);

		return view && !view.target ? [only.label] : [];
	});
}
