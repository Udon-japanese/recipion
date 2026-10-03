import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { createDb } from "#/db/client";
import { prepareRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import { validateRecipeEditorDocument } from "#/features/recipes/domain/validate-recipe-editor-document";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { createAuth } from "#/integrations/better-auth/auth";

export const createRecipeServerFn = createServerFn({
	method: "POST",
})
	.validator((input) =>
		prepareRecipeForStorage(validateRecipeEditorDocument(input)),
	)
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

		return repository.create(data);
	});
