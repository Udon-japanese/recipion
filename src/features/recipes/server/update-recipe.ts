import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { prepareRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import { validateRecipeEditorDocument } from "#/features/recipes/domain/validate-recipe-editor-document";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

const updateRecipeInputSchema = v.object({
	publicId: v.pipe(v.string(), v.maxLength(100)),
	document: v.unknown(),
});

export const updateRecipeServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => {
		const { publicId, document } = v.parse(updateRecipeInputSchema, input);

		return {
			publicId,
			recipe: prepareRecipeForStorage(validateRecipeEditorDocument(document)),
		};
	})
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		const repository = createDrizzleRecipeRepository(db, userId);
		const updated = await repository.update(data.publicId, data.recipe);

		// 存在しない場合と、他のユーザーのレシピの場合は、どちらも同じ扱いにする。
		if (!updated) {
			throw new Error("レシピが見つかりません");
		}

		return updated;
	});
