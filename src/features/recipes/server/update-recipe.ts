import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { UserFacingError } from "#/errors/user-facing-error";
import { prepareRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import { RECIPE_CHANGED_ELSEWHERE_MESSAGE } from "#/features/recipes/domain/recipe-revision";
import { recipeSnapshotSchema } from "#/features/recipes/domain/recipe-snapshot";
import { validateRecipeEditorDocument } from "#/features/recipes/domain/validate-recipe-editor-document";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { guardRecipePublication } from "#/features/recipes/server/guard-recipe-publication";
import { assertParentSnapshotIsCurrent } from "#/features/recipes/server/parent-merge";
import { resolvePassphraseCipher } from "#/features/recipes/server/resolve-passphrase";
import { requireSession } from "#/integrations/better-auth/require-session";

const updateRecipeInputSchema = v.object({
	publicId: v.pipe(v.string(), v.maxLength(100)),
	document: v.unknown(),
	// 編集を開いたときの版。null は、ほかの画面で保存されていても、上書きする（本人が選んだとき）。
	expectedRevision: v.nullable(v.pipe(v.string(), v.maxLength(40))),
	// 親の変更を取り込んで保存するとき、取り込んだ親の中身（今の親と同じかを確かめてから、写しにする）。
	parentSnapshot: v.optional(recipeSnapshotSchema),
});

export const updateRecipeServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => {
		const { publicId, document, expectedRevision, parentSnapshot } = v.parse(
			updateRecipeInputSchema,
			input,
		);

		return {
			publicId,
			expectedRevision,
			parentSnapshot,
			recipe: prepareRecipeForStorage(validateRecipeEditorDocument(document)),
		};
	})
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		const repository = createDrizzleRecipeRepository(db, userId);

		if (data.parentSnapshot) {
			await assertParentSnapshotIsCurrent(
				db,
				userId,
				data.publicId,
				data.parentSnapshot,
			);
		}

		const publication = await guardRecipePublication(db, userId, data.recipe);
		const passphraseCipher = await resolvePassphraseCipher(
			db,
			userId,
			data.recipe.visibility,
			data.publicId,
		);
		const updated = await repository.update(
			data.publicId,
			{
				...data.recipe,
				passphraseCipher,
				...(data.parentSnapshot ? { parentSnapshot: data.parentSnapshot } : {}),
			},
			data.expectedRevision,
		);

		// 存在しない場合と、他のユーザーのレシピの場合は、どちらも同じ扱いにする。
		if (!updated) {
			throw new UserFacingError("レシピが見つかりません");
		}

		if (updated.status === "conflict") {
			throw new UserFacingError(RECIPE_CHANGED_ELSEWHERE_MESSAGE);
		}

		await publication.recordFlag(updated.publicId);

		return { publicId: updated.publicId, revision: updated.revision };
	});
