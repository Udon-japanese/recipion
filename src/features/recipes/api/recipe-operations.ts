import { env } from "cloudflare:workers";

import { eq } from "drizzle-orm";

import { UserFacingError } from "#/errors/user-facing-error";
import { user } from "#/integrations/better-auth/auth.sql";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import { loadLinkedRecipeTree } from "../application/load-linked-recipe-tree";
import type { PreparedRecipeForStorage } from "../application/prepare-recipe-for-storage";
import {
	parseRecipeSearchTerms,
	parseSearchTags,
} from "../domain/public-recipe-search";
import { RECIPE_CHANGED_ELSEWHERE_MESSAGE } from "../domain/recipe-revision";
import {
	createRecipeSnapshot,
	type RecipeSnapshot,
} from "../domain/recipe-snapshot";
import {
	listPublicRecipesOfUser,
	searchLinkableUsers,
} from "../infrastructure/drizzle-linkable-recipes";
import { searchPublicRecipes } from "../infrastructure/drizzle-public-recipe-search";
import { createDrizzleRecipeCookLogRepository } from "../infrastructure/drizzle-recipe-cook-log-repository";
import { createDrizzleRecipeRepository } from "../infrastructure/drizzle-recipe-repository";
import { createDrizzleRecipeSharingRepository } from "../infrastructure/drizzle-recipe-sharing-repository";
import {
	attemptUnlock,
	findForkableParent,
	findViewableRecipe,
	loadParentMergeSource,
} from "../infrastructure/drizzle-recipe-viewer-repository";
import { guardRecipePublication } from "./guard-recipe-publication";
import { assertParentSnapshotIsCurrent } from "./parent-merge";
import {
	createEncryptedPassphrase,
	readPassphrase,
	resolvePassphraseCipher,
} from "./resolve-passphrase";
import { assertWithinSearchLimit } from "./search-rate-limit";

const RECIPE_NOT_FOUND_MESSAGE = "レシピが見つかりません";

// レシピの API の中身（DB・審査・合言葉をつなぐ）。入口の形の確認は recipe-routes.ts、ここは確かめたあとの処理。
export function createRecipeOperations({ db, userId }: ResolvedSession) {
	const repository = createDrizzleRecipeRepository(db, userId);
	const cookLogs = createDrizzleRecipeCookLogRepository(db, userId);
	const sharing = createDrizzleRecipeSharingRepository(db, userId);

	return {
		list: () => repository.list(),

		// 見てよいレシピ（自分のレシピ、全体公開、パスフレーズで開けた限定公開）。存在しない・見てはいけないは、どちらも null。
		async getViewable(publicId: string) {
			return (await findViewableRecipe(db, userId, publicId))?.recipe ?? null;
		},

		// みんなのレシピ（全体公開）の一覧と検索。
		async searchPublic(input: {
			query: string;
			cursor: string | null;
			tags: string[];
		}) {
			await assertWithinSearchLimit(userId);

			return searchPublicRecipes(
				db,
				userId,
				parseRecipeSearchTerms(input.query),
				input.cursor,
				parseSearchTags(input.tags),
			);
		},

		// 本人のうちの人数（設定していなければ null）。
		async getHouseholdSize() {
			const [row] = await db
				.select({ householdSize: user.householdSize })
				.from(user)
				.where(eq(user.id, userId))
				.limit(1);

			return row?.householdSize ?? null;
		},

		// 本人のうちの人数を保存する（null は、設定しない）。本人だけが使う値なので、審査の対象にしない。
		async updateHouseholdSize(householdSize: number | null) {
			await db.update(user).set({ householdSize }).where(eq(user.id, userId));

			return householdSize;
		},

		// レシピの画面に出す分（中身・作者・日付・もとにしたレシピ）。見てはいけない・存在しないは、どちらも null。
		view: (publicId: string) => findViewableRecipe(db, userId, publicId),

		// 限定公開のレシピを、パスフレーズで開ける。違う・存在しない・非公開は、どれも同じ「wrong」。
		unlock: (input: { publicId: string; passphrase: string }) =>
			attemptUnlock(db, {
				viewerUserId: userId,
				publicId: input.publicId,
				passphrase: input.passphrase,
				secret: env.BETTER_AUTH_SECRET,
				now: new Date(),
			}),

		// 自分の限定公開レシピの、パスフレーズ（限定公開でなければ null）。
		async getPassphrase(publicId: string) {
			const state = await sharing.getSharingState(publicId);

			if (state?.visibility !== "unlisted" || !state.passphraseCipher) {
				return null;
			}

			return readPassphrase(state.passphraseCipher);
		},

		// パスフレーズを作り直す。これまでに開けた人は、新しいパスフレーズを入れないと、見られなくなる。
		async regeneratePassphrase(publicId: string) {
			const cipher = await createEncryptedPassphrase();

			if (!(await sharing.replacePassphrase(publicId, cipher))) {
				throw new UserFacingError("限定公開のレシピが見つかりません", {
					code: "NOT_FOUND",
				});
			}

			return readPassphrase(cipher);
		},

		// 材料のリンク先のレシピを、リンク先の中のリンクもたどって、まとめて返す（公開 ID → レシピ）。
		// 存在しない場合と、見てはいけないレシピは、含めない。
		linked: (publicIds: string[]) =>
			loadLinkedRecipeTree(
				publicIds,
				async (publicId) =>
					(await findViewableRecipe(db, userId, publicId))?.recipe ?? null,
			),

		// 他の人のレシピへのリンクのための、ユーザーの検索（全体公開のレシピを持つ人だけ。ハンドルか表示名の前方一致）。
		async searchLinkableUsers(query: string) {
			await assertWithinSearchLimit(userId);

			return searchLinkableUsers(db, userId, query);
		},

		// そのユーザーの、全体公開のレシピの一覧。
		async listUserPublicRecipes(handle: string) {
			await assertWithinSearchLimit(userId);

			return listPublicRecipesOfUser(db, userId, handle);
		},

		// 自分の子のレシピの、親の変更を取り込むための材料（写しと、今の親）。取り込めなければ null。
		parentMergeSource: (publicId: string) =>
			loadParentMergeSource(db, userId, publicId),

		// 「今回の変更は取り込まない」：子の中身は変えず、写しだけを、今の親にする（知らせが消える）。
		async dismissParentChanges(input: {
			publicId: string;
			parentSnapshot: RecipeSnapshot;
		}) {
			await assertParentSnapshotIsCurrent(
				db,
				userId,
				input.publicId,
				input.parentSnapshot,
			);

			if (
				!(await repository.replaceParentSnapshot(
					input.publicId,
					input.parentSnapshot,
				))
			) {
				throw new UserFacingError(RECIPE_NOT_FOUND_MESSAGE, {
					code: "NOT_FOUND",
				});
			}

			return { dismissed: true as const };
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
