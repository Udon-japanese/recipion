import type { DB } from "#/db/client";
import {
	describeFlagReasons,
	describePublishRefusal,
} from "#/features/moderation/application/publish-refusal-message";
import { checkBeforePublish } from "#/features/moderation/server/create-publish-guard";
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

	const result = await checkBeforePublish(db, {
		userId,
		items: collectRecipeModerationItems(recipe),
	});
	const refusal = describePublishRefusal(result);

	if (refusal !== null) {
		throw new Error(refusal);
	}

	if (result.status !== "flagged") {
		return { recordFlag: async () => {} };
	}

	return {
		recordFlag: async (publicId) => {
			await createDrizzleReportRepository(db).createAutoDetected({
				recipePublicId: publicId,
				detail: describeFlagReasons(result.reasons),
				now: new Date(),
			});
		},
	};
}
