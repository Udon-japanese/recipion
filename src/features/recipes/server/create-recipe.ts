import { createServerFn } from "@tanstack/react-start";
import { prepareRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import { validateRecipeEditorDocument } from "#/features/recipes/domain/validate-recipe-editor-document";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { guardRecipePublication } from "#/features/recipes/server/guard-recipe-publication";
import { resolvePassphraseCipher } from "#/features/recipes/server/resolve-passphrase";
import { requireSession } from "#/integrations/better-auth/require-session";

export const createRecipeServerFn = createServerFn({
	method: "POST",
})
	.validator((input) =>
		prepareRecipeForStorage(validateRecipeEditorDocument(input)),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		const repository = createDrizzleRecipeRepository(db, userId);

		const publication = await guardRecipePublication(db, userId, data);
		const passphraseCipher = await resolvePassphraseCipher(
			db,
			userId,
			data.visibility,
			null,
		);
		const created = await repository.create({ ...data, passphraseCipher });

		await publication.recordFlag(created.publicId);

		return created;
	});
