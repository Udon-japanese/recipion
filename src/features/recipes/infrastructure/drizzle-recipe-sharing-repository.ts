import { and, eq } from "drizzle-orm";

import type { DB } from "#/db/client";
import type { RecipeSharingRepository } from "../application/recipe-sharing-repository";
import { parseRecipeVisibility } from "../domain/recipe-link-permission";
import { recipe, recipeUnlock, recipeUnlockAttempt } from "./recipe.sql";

// 公開範囲・パスフレーズまわり。持ち主のレシピだけを扱う。
export function createDrizzleRecipeSharingRepository(
	db: DB,
	userId: string,
): RecipeSharingRepository {
	return {
		async getSharingState(publicId) {
			const [found] = await db
				.select({
					visibility: recipe.visibility,
					passphrase: recipe.unlistedPassphrase,
				})
				.from(recipe)
				.where(and(eq(recipe.publicId, publicId), eq(recipe.userId, userId)))
				.limit(1);

			if (!found) {
				return null;
			}

			return {
				visibility: parseRecipeVisibility(found.visibility),
				passphraseCipher: found.passphrase,
			};
		},

		async replacePassphrase(publicId, cipher) {
			return db.transaction(async (transaction) => {
				const [updated] = await transaction
					.update(recipe)
					.set({ unlistedPassphrase: cipher })
					.where(
						and(
							eq(recipe.publicId, publicId),
							eq(recipe.userId, userId),
							eq(recipe.visibility, "unlisted"),
						),
					)
					.returning({ id: recipe.id });

				if (!updated) {
					return false;
				}

				await transaction
					.delete(recipeUnlock)
					.where(eq(recipeUnlock.recipeId, updated.id));
				await transaction
					.delete(recipeUnlockAttempt)
					.where(eq(recipeUnlockAttempt.publicId, publicId));

				return true;
			});
		},
	};
}
