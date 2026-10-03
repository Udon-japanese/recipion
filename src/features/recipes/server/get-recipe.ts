import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import * as v from "valibot";

import { createDb } from "#/db/client";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { createAuth } from "#/integrations/better-auth/auth";

const getRecipeInputSchema = v.object({
	publicId: v.pipe(v.string(), v.maxLength(100)),
});

// 存在しない場合と、他のユーザーのレシピの場合は、どちらも null を返す。
export const getRecipeServerFn = createServerFn({
	method: "GET",
})
	.validator((input) => v.parse(getRecipeInputSchema, input))
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

		return repository.getByPublicId(data.publicId);
	});
