import type { DB } from "#/db/client";
import { UserFacingError } from "#/errors/user-facing-error";
import {
	isSameSnapshot,
	PARENT_CHANGED_AGAIN_MESSAGE,
	type RecipeSnapshot,
} from "#/features/recipes/domain/recipe-snapshot";
import { loadParentMergeSource } from "#/features/recipes/infrastructure/drizzle-recipe-viewer-repository";

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
		throw new UserFacingError("もとのレシピが見つかりません", {
			code: "NOT_FOUND",
		});
	}

	if (!isSameSnapshot(source.current, snapshot)) {
		throw new UserFacingError(PARENT_CHANGED_AGAIN_MESSAGE, {
			code: "CONFLICT",
		});
	}
}
