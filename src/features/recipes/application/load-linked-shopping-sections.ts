import {
	linkedRecipeRatio,
	resolveIngredientLinks,
} from "../domain/link-ingredient-needs";
import type { MadeRecipeUse } from "../domain/made-recipe-stock";
import {
	flattenRecipeIngredients,
	type RecipeShoppingNeed,
} from "../domain/plan-shopping-from-recipe";
import { scaleRecipeNeed } from "../domain/scale-recipe-need";
import type { RecipeDetail } from "./recipe-repository";

export type LinkedShoppingSection = {
	publicId: string;
	// 例：「和風ドレッシングの材料」
	title: string;
	needs: RecipeShoppingNeed[];
};

export type LinkedShoppingSections = {
	sections: LinkedShoppingSection[];
	// 在庫のできあがり（作り置き）から使う分。この分の材料は、sections に含めない。
	madeUses: MadeRecipeUse[];
	// 読み込めなかった、リンク先のレシピの名前。
	failedNames: string[];
};

function round(value: number): number {
	return Number(value.toFixed(6));
}

// リンクをたどる深さの上限（リンクが輪になっていても、止まるように、たどっている途中のレシピは展開しない）。
const maxDepth = 3;

/**
 * 材料が、他のレシピへのリンクのとき、そのレシピの材料を取ってきて、まとまり（リンク先の名前ごと）にする。
 * - リンク先の中にあるリンクも、たどる。リンク先が見つからないレシピは、含めない。
 * - リンクの行の分量は、リンク先の何回分を使うかの割合（半分・2倍・2人分など）。材料の分量に掛ける。入れ子のときは掛け合わせる。
 * - 同じレシピに複数のリンクがあるときは、割合を足して、1つのまとまりにする。
 * - 在庫に、リンク先のできあがり（作り置き。madeStock：元のレシピの publicId → 回分）があれば、その分を先に使い、
 *   材料の展開は、足りない分だけにする（全部まかなえるなら、そのレシピの材料は含めない）。
 */
export async function loadLinkedShoppingSections(
	needs: readonly RecipeShoppingNeed[],
	loadRecipe: (publicId: string) => Promise<RecipeDetail | null>,
	madeStock: ReadonlyMap<string, number> = new Map(),
): Promise<LinkedShoppingSections> {
	const remainingMade = new Map(madeStock);
	const madeUses = new Map<string, MadeRecipeUse>();
	const failedNames: string[] = [];
	const failedPublicIds = new Set<string>();
	// 出てきた順。割合は、リンクをたどった道すじごとの割合の合計。
	const entries = new Map<
		string,
		{
			recipe: RecipeDetail;
			resolved: RecipeShoppingNeed[];
			ratio: number;
		}
	>();

	async function expand(
		linkedNeeds: readonly RecipeShoppingNeed[],
		depth: number,
		scale: number,
		path: ReadonlySet<string>,
	) {
		for (const need of linkedNeeds) {
			const target = need.linkedRecipe;

			if (
				!target ||
				path.has(target.publicId) ||
				failedPublicIds.has(target.publicId) ||
				depth > maxDepth
			) {
				continue;
			}

			let entry = entries.get(target.publicId);

			if (!entry) {
				let recipe: RecipeDetail | null;

				try {
					recipe = await loadRecipe(target.publicId);
				} catch {
					failedNames.push(target.name);
					failedPublicIds.add(target.publicId);
					continue;
				}

				if (!recipe) {
					failedPublicIds.add(target.publicId);
					continue;
				}

				entry = {
					recipe,
					resolved: resolveIngredientLinks(
						flattenRecipeIngredients(recipe.ingredients),
						recipe.linkViews,
					),
					ratio: 0,
				};
				entries.set(target.publicId, entry);
			}

			const wanted = scale * linkedRecipeRatio(need, entry.recipe.servings);

			// 在庫のできあがりを先に使い、足りない分だけ、材料を展開する。
			const available = remainingMade.get(target.publicId) ?? 0;
			const used = round(Math.min(available, wanted));

			if (used > 0) {
				remainingMade.set(target.publicId, round(available - used));
				madeUses.set(target.publicId, {
					publicId: target.publicId,
					name: entry.recipe.name,
					quantity: round(
						(madeUses.get(target.publicId)?.quantity ?? 0) + used,
					),
				});
			}

			const ratio = round(wanted - used);

			if (ratio <= 0) {
				continue;
			}

			entry.ratio += ratio;

			await expand(
				entry.resolved.filter((item) => item.linkedRecipe),
				depth + 1,
				ratio,
				new Set([...path, target.publicId]),
			);
		}
	}

	await expand(
		needs.filter((need) => need.linkedRecipe),
		1,
		1,
		new Set(),
	);

	// 全部を在庫のできあがりでまかなったレシピは、材料を含めない。
	const sections = [...entries]
		.filter(([, { ratio }]) => ratio > 0)
		.map(([publicId, { recipe, resolved, ratio }]) => ({
			publicId,
			title: `${recipe.name}の材料`,
			needs: resolved
				.filter((item) => !item.linkedRecipe)
				.map((item) => ({
					...scaleRecipeNeed(item, ratio),
					id: `${publicId}/${item.id}`,
					sectionTitle: `${recipe.name}の材料`,
				})),
		}));

	return { sections, madeUses: [...madeUses.values()], failedNames };
}
