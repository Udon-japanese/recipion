import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

const getRecipeInputSchema = v.object({
	publicId: v.pipe(v.string(), v.maxLength(100)),
});

// 存在しない場合と、他のユーザーのレシピの場合は、どちらも null を返す。
export const getRecipeServerFn = createServerFn({
	method: "GET",
})
	.validator((input) => v.parse(getRecipeInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		const repository = createDrizzleRecipeRepository(db, userId);

		return repository.getByPublicId(data.publicId);
	});
