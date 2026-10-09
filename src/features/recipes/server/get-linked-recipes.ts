import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { loadLinkedRecipeTree } from "#/features/recipes/application/load-linked-recipe-tree";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

const getLinkedRecipesInputSchema = v.object({
	publicIds: v.pipe(
		v.array(v.pipe(v.string(), v.maxLength(100))),
		v.maxLength(30),
	),
});

// 材料のリンク先のレシピを、リンク先の中のリンクもたどって、まとめて返す（公開 ID → レシピ）。
// 存在しない場合と、他のユーザーのレシピは、含めない。
export const getLinkedRecipesServerFn = createServerFn({
	method: "GET",
})
	.validator((input) => v.parse(getLinkedRecipesInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();
		const repository = createDrizzleRecipeRepository(db, userId);

		return loadLinkedRecipeTree(data.publicIds, (publicId) =>
			repository.getByPublicId(publicId),
		);
	});
