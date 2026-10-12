import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { loadLinkedRecipeTree } from "#/features/recipes/application/load-linked-recipe-tree";
import { findViewableRecipe } from "#/features/recipes/infrastructure/drizzle-recipe-viewer-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

const getLinkedRecipesInputSchema = v.object({
	publicIds: v.pipe(
		v.array(v.pipe(v.string(), v.maxLength(100))),
		v.maxLength(30),
	),
});

// 材料のリンク先のレシピを、リンク先の中のリンクもたどって、まとめて返す（公開 ID → レシピ）。
// 存在しない場合と、見てはいけないレシピは、含めない。
export const getLinkedRecipesServerFn = createServerFn({
	method: "GET",
})
	.validator((input) => v.parse(getLinkedRecipesInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return loadLinkedRecipeTree(
			data.publicIds,
			async (publicId) =>
				(await findViewableRecipe(db, userId, publicId))?.recipe ?? null,
		);
	});
