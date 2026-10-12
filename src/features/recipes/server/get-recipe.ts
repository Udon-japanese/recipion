import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { findViewableRecipe } from "#/features/recipes/infrastructure/drizzle-recipe-viewer-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

const getRecipeInputSchema = v.object({
	publicId: v.pipe(v.string(), v.maxLength(100)),
});

// 見てよいレシピ（自分のレシピ、全体公開、パスフレーズで開けた限定公開）。
// 存在しない場合と、見てはいけない場合は、どちらも null を返す。
export const getRecipeServerFn = createServerFn({
	method: "GET",
})
	.validator((input) => v.parse(getRecipeInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return (
			(await findViewableRecipe(db, userId, data.publicId))?.recipe ?? null
		);
	});
