import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import type { DB } from "#/db/client";
import { UserFacingError } from "#/errors/user-facing-error";
import {
	isSameSnapshot,
	PARENT_CHANGED_AGAIN_MESSAGE,
	type RecipeSnapshot,
	recipeSnapshotSchema,
} from "#/features/recipes/domain/recipe-snapshot";
import { createDrizzleRecipeRepository } from "#/features/recipes/infrastructure/drizzle-recipe-repository";
import { loadParentMergeSource } from "#/features/recipes/infrastructure/drizzle-recipe-viewer-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

const publicIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(100));

// 画面で取り込んだ親の中身が、今の親と同じかを確かめる（比べたあとに、親がまた変わっていれば、断る）。
// 継承していない・親を見られないときも、断る。
export async function assertParentSnapshotIsCurrent(
	db: DB,
	userId: string,
	childPublicId: string,
	snapshot: RecipeSnapshot,
): Promise<void> {
	const source = await loadParentMergeSource(db, userId, childPublicId);

	if (!source) {
		throw new UserFacingError("もとのレシピが見つかりません");
	}

	if (!isSameSnapshot(source.current, snapshot)) {
		throw new UserFacingError(PARENT_CHANGED_AGAIN_MESSAGE);
	}
}

// 自分の子のレシピの、親の変更を取り込むための材料（写しと、今の親）。取り込めなければ null。
export const getParentMergeSourceServerFn = createServerFn({ method: "GET" })
	.validator((input) => v.parse(v.object({ publicId: publicIdSchema }), input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return loadParentMergeSource(db, userId, data.publicId);
	});

// 「今回の変更は取り込まない」：子の中身は変えず、写しだけを、今の親にする（知らせが消える）。
export const dismissParentChangesServerFn = createServerFn({ method: "POST" })
	.validator((input) =>
		v.parse(
			v.object({
				publicId: publicIdSchema,
				parentSnapshot: recipeSnapshotSchema,
			}),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		await assertParentSnapshotIsCurrent(
			db,
			userId,
			data.publicId,
			data.parentSnapshot,
		);

		const replaced = await createDrizzleRecipeRepository(
			db,
			userId,
		).replaceParentSnapshot(data.publicId, data.parentSnapshot);

		if (!replaced) {
			throw new UserFacingError("レシピが見つかりません");
		}
	});
