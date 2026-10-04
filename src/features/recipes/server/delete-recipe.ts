import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

const deleteRecipeInputSchema = v.object({
	publicId: v.pipe(v.string(), v.maxLength(100)),
});

export const deleteRecipeServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => v.parse(deleteRecipeInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		const repository = createDrizzleRecipeRepository(db, userId);
		const deleted = await repository.delete(data.publicId);

		// 存在しない場合と、他のユーザーのレシピの場合は、どちらも同じ扱いにする。
		if (!deleted) {
			throw new Error("レシピが見つかりません");
		}

		return { deleted: true as const };
	});
