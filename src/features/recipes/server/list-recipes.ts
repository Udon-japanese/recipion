import { createServerFn } from "@tanstack/react-start";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

export const listRecipesServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db, userId } = await requireSession();

	const repository = createDrizzleRecipeRepository(db, userId);

	return repository.list();
});
