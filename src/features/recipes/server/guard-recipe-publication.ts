import type { DB } from "#/db/client";
import { notifyAdminsOf } from "#/features/admin/server/notify-admins";
import { describeFlagReasons } from "#/features/moderation/application/publish-refusal-message";
import { enforceModeration } from "#/features/moderation/server/enforce-moderation";
import { collectRecipeModerationItems } from "#/features/recipes/application/collect-moderation-items";
import type { PreparedRecipeForStorage } from "#/features/recipes/application/prepare-recipe-for-storage";
import { createDrizzleReportRepository } from "#/features/reports/infrastructure/drizzle-report-repository";

// 保存の前に、公開するレシピの内容を審査する（非公開は審査しない）。公開できないときは、利用者に見せる文で例外を投げる。
// 怪しいと判定されたときは、保存のあとに recordFlag を呼ぶ（管理者の画面に、自動検知として載せる）。
export async function guardRecipePublication(
	db: DB,
	userId: string,
	recipe: PreparedRecipeForStorage,
): Promise<{ recordFlag: (publicId: string) => Promise<void> }> {
	if (recipe.visibility === "private") {
		return { recordFlag: async () => {} };
	}

	const enforcement = await enforceModeration(
		db,
		userId,
		collectRecipeModerationItems(recipe),
	);

	if (enforcement.status === "refused") {
		throw new Error(enforcement.message);
	}

	const flagged = enforcement.flagged;

	if (flagged === null) {
		return { recordFlag: async () => {} };
	}

	return {
		recordFlag: async (publicId) => {
			const result = await createDrizzleReportRepository(db).createAutoDetected(
				{
					recipePublicId: publicId,
					detail: describeFlagReasons(flagged),
					now: new Date(),
				},
			);

			// 新しい自動検知が入ったら、管理者に知らせる（送れなくても、公開は成功のまま）。
			if (result === "created") {
				await notifyAdminsOf(db, "auto-detected");
			}
		},
	};
}
