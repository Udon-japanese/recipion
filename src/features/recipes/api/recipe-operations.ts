import { UserFacingError } from "#/errors/user-facing-error";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import type { PreparedRecipeForStorage } from "../application/prepare-recipe-for-storage";
import { RECIPE_CHANGED_ELSEWHERE_MESSAGE } from "../domain/recipe-revision";
import {
	createRecipeSnapshot,
	type RecipeSnapshot,
} from "../domain/recipe-snapshot";
import { createDrizzleRecipeCookLogRepository } from "../infrastructure/drizzle-recipe-cook-log-repository";
import { createDrizzleRecipeRepository } from "../infrastructure/drizzle-recipe-repository";
import {
	findForkableParent,
	findViewableRecipe,
} from "../infrastructure/drizzle-recipe-viewer-repository";
import { guardRecipePublication } from "../server/guard-recipe-publication";
import { assertParentSnapshotIsCurrent } from "../server/parent-merge";
import { resolvePassphraseCipher } from "../server/resolve-passphrase";

const RECIPE_NOT_FOUND_MESSAGE = "レシピが見つかりません";

// レシピの API の中身（DB・審査・合言葉をつなぐ）。入口の形の確認は recipe-routes.ts、ここは確かめたあとの処理。
export function createRecipeOperations({ db, userId }: ResolvedSession) {
	const repository = createDrizzleRecipeRepository(db, userId);
	const cookLogs = createDrizzleRecipeCookLogRepository(db, userId);

	return {
		list: () => repository.list(),

		// 見てよいレシピ（自分のレシピ、全体公開、パスフレーズで開けた限定公開）。存在しない・見てはいけないは、どちらも null。
		async getViewable(publicId: string) {
			return (await findViewableRecipe(db, userId, publicId))?.recipe ?? null;
		},

		// 自分のレシピだけ（編集の画面）。内容と、いまの版。存在しない・他の人のレシピは、どちらも null。
		getOwn: (publicId: string) => repository.getForEdit(publicId),

		async create(recipe: PreparedRecipeForStorage) {
			const publication = await guardRecipePublication(db, userId, recipe);
			const passphraseCipher = await resolvePassphraseCipher(
				db,
				userId,
				recipe.visibility,
				null,
			);
			const created = await repository.create({ ...recipe, passphraseCipher });

			await publication.recordFlag(created.publicId);

			return created;
		},

		async update(input: {
			publicId: string;
			recipe: PreparedRecipeForStorage;
			// 編集を開いたときの版。null は、ほかの画面で保存されていても上書きする（本人が選んだとき）。
			expectedRevision: string | null;
			// 親の変更を取り込んで保存するとき、取り込んだ親の中身（今の親と同じかを確かめてから、写しにする）。
			parentSnapshot?: RecipeSnapshot;
		}) {
			if (input.parentSnapshot) {
				await assertParentSnapshotIsCurrent(
					db,
					userId,
					input.publicId,
					input.parentSnapshot,
				);
			}

			const publication = await guardRecipePublication(
				db,
				userId,
				input.recipe,
			);
			const passphraseCipher = await resolvePassphraseCipher(
				db,
				userId,
				input.recipe.visibility,
				input.publicId,
			);
			const updated = await repository.update(
				input.publicId,
				{
					...input.recipe,
					passphraseCipher,
					...(input.parentSnapshot
						? { parentSnapshot: input.parentSnapshot }
						: {}),
				},
				input.expectedRevision,
			);

			// 存在しない場合と、他のユーザーのレシピの場合は、どちらも同じ扱いにする。
			if (!updated) {
				throw new UserFacingError(RECIPE_NOT_FOUND_MESSAGE, {
					code: "NOT_FOUND",
				});
			}

			if (updated.status === "conflict") {
				throw new UserFacingError(RECIPE_CHANGED_ELSEWHERE_MESSAGE, {
					code: "CONFLICT",
				});
			}

			await publication.recordFlag(updated.publicId);

			return { publicId: updated.publicId, revision: updated.revision };
		},

		async delete(publicId: string) {
			// 存在しない場合と、他のユーザーのレシピの場合は、どちらも同じ扱いにする。
			if (!(await repository.delete(publicId))) {
				throw new UserFacingError(RECIPE_NOT_FOUND_MESSAGE, {
					code: "NOT_FOUND",
				});
			}

			return { deleted: true as const };
		},

		// 「このレシピをもとに作る」。親を記録し、そのときの親の中身（写し）は、サーバーで作る（画面から送られた写しは使わない）。
		// 保存の手順（上限・審査・公開範囲）は、ふつうの登録と同じ。
		async fork(input: {
			parentPublicId: string;
			recipe: PreparedRecipeForStorage;
		}) {
			const parent = await findForkableParent(db, userId, input.parentPublicId);

			if (!parent) {
				throw new UserFacingError("もとにするレシピが見つかりません", {
					code: "NOT_FOUND",
				});
			}

			const publication = await guardRecipePublication(
				db,
				userId,
				input.recipe,
			);
			const passphraseCipher = await resolvePassphraseCipher(
				db,
				userId,
				input.recipe.visibility,
				null,
			);
			const created = await repository.create({
				...input.recipe,
				passphraseCipher,
				parent: {
					recipeId: parent.id,
					snapshot: createRecipeSnapshot(parent.detail),
				},
			});

			await publication.recordFlag(created.publicId);

			return created;
		},

		recordCook: (input: {
			recipePublicId: string;
			sourceId: string;
			yieldText: string;
		}) => cookLogs.record(input),

		cancelCook: (input: { recipePublicId: string; sourceId: string }) =>
			cookLogs.cancel(input),

		cookStats: (publicId: string) => cookLogs.statsFor(publicId),

		listCooks: (cursor: string | null) => cookLogs.list(cursor),
	};
}

export type RecipeOperations = ReturnType<typeof createRecipeOperations>;
