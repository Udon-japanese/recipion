import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import * as v from "valibot";

import { createDb } from "#/db/client";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { createAuth } from "#/integrations/better-auth/auth";

const deleteRecipeInputSchema = v.object({
	publicId: v.pipe(v.string(), v.maxLength(100)),
});

export const deleteRecipeServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => v.parse(deleteRecipeInputSchema, input))
	.handler(async ({ data }) => {
		const { db } = await createDb();
		const auth = createAuth(db);

		const session = await auth.api.getSession({
			headers: getRequestHeaders(),
		});

		if (!session) {
			throw new Error("認証が必要です");
		}

		const repository = createDrizzleRecipeRepository(db, session.user.id);
		const deleted = await repository.delete(data.publicId);

		// 存在しない場合と、他のユーザーのレシピの場合は、どちらも同じ扱いにする。
		if (!deleted) {
			throw new Error("レシピが見つかりません");
		}

		return { deleted: true as const };
	});
