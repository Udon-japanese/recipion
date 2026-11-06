import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { UserFacingError } from "#/errors/user-facing-error";
import { prepareRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import { createRecipeSnapshot } from "#/features/recipes/domain/recipe-snapshot";
import { validateRecipeEditorDocument } from "#/features/recipes/domain/validate-recipe-editor-document";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { findForkableParent } from "#/features/recipes/infrastructure/drizzle-recipe-viewer-repository";
import { guardRecipePublication } from "#/features/recipes/server/guard-recipe-publication";
import { resolvePassphraseCipher } from "#/features/recipes/server/resolve-passphrase";
import { requireSession } from "#/integrations/better-auth/require-session";

const forkRecipeInputSchema = v.object({
	parentPublicId: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
	document: v.unknown(),
});

// 「このレシピをもとに作る」で、新しいレシピを保存する。親を記録し、そのときの親の中身（写し）を、サーバーで作って持つ
// （画面から送られた写しは使わない）。保存の手順（上限・審査・公開範囲）は、ふつうの登録と同じ。
export const forkRecipeServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => {
		const { parentPublicId, document } = v.parse(forkRecipeInputSchema, input);

		return {
			parentPublicId,
			recipe: prepareRecipeForStorage(validateRecipeEditorDocument(document)),
		};
	})
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();
		const parent = await findForkableParent(db, userId, data.parentPublicId);

		if (!parent) {
			throw new UserFacingError("もとにするレシピが見つかりません");
		}

		const repository = createDrizzleRecipeRepository(db, userId);
		const publication = await guardRecipePublication(db, userId, data.recipe);
		const passphraseCipher = await resolvePassphraseCipher(
			db,
			userId,
			data.recipe.visibility,
			null,
		);
		const created = await repository.create({
			...data.recipe,
			passphraseCipher,
			parent: {
				recipeId: parent.id,
				snapshot: createRecipeSnapshot(parent.detail),
			},
		});

		await publication.recordFlag(created.publicId);

		return created;
	});
