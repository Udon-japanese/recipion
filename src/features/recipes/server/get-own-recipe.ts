import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

const getRecipeInputSchema = v.object({
	publicId: v.pipe(v.string(), v.maxLength(100)),
});

// 自分のレシピだけ（編集の画面で使う）。存在しない場合と、他のユーザーのレシピの場合は、どちらも null。
export const getOwnRecipeServerFn = createServerFn({
	method: "GET",
})
	.validator((input) => v.parse(getRecipeInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return createDrizzleRecipeRepository(db, userId).getByPublicId(
			data.publicId,
		);
	});
