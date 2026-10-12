import { and, count, eq, gte } from "drizzle-orm";

import type { DB } from "#/db/client";
import { user } from "#/integrations/better-auth/auth.sql";
import type { RecipeDetail } from "../application/recipe-repository";
import {
	isPassphraseLocked,
	normalizePassphraseInput,
} from "../domain/passphrase";
import { parseRecipeVisibility } from "../domain/recipe-link-permission";
import { loadRecipeDetail } from "./drizzle-recipe-repository";
import { decryptPassphrase } from "./passphrase-cipher";
import { recipe, recipeUnlock, recipeUnlockAttempt } from "./recipe.sql";

const oneHourMs = 60 * 60 * 1000;
// 1人が、1時間に、どのレシピでも合わせて失敗してよい回数（存在しない ID を、次々に試す探りを止める）。
const maxFailuresPerHourOverall = 20;

export type ViewableRecipe = {
	recipe: RecipeDetail;
	isOwn: boolean;
	// 作者の、公開される名前（メールアドレスは含めない）。
	author: { name: string; handle: string };
};

// 見る人（viewerUserId）が見てよいレシピ。自分のレシピ、全体公開、パスフレーズで開けた限定公開。
// 見てはいけない・存在しないレシピは、どちらも null（存在を推測させない）。
export async function findViewableRecipe(
	db: DB,
	viewerUserId: string,
	publicId: string,
): Promise<ViewableRecipe | null> {
	const [row] = await db
		.select({
			recipe,
			authorName: user.name,
			authorHandle: user.handle,
		})
		.from(recipe)
		.innerJoin(user, eq(user.id, recipe.userId))
		.where(eq(recipe.publicId, publicId))
		.limit(1);

	if (!row) {
		return null;
	}

	const isOwn = row.recipe.userId === viewerUserId;
	const visibility = parseRecipeVisibility(row.recipe.visibility);
	let canView = isOwn || visibility === "public";

	if (!canView && visibility === "unlisted") {
		const [unlocked] = await db
			.select({ recipeId: recipeUnlock.recipeId })
			.from(recipeUnlock)
			.where(
				and(
					eq(recipeUnlock.recipeId, row.recipe.id),
					eq(recipeUnlock.userId, viewerUserId),
				),
			)
			.limit(1);

		canView = unlocked !== undefined;
	}

	if (!canView) {
		return null;
	}

	const detail = await loadRecipeDetail(db, row.recipe, viewerUserId);

	return {
		recipe: isOwn
			? detail
			: {
					...detail,
					author: { name: row.authorName, handle: row.authorHandle },
				},
		isOwn,
		author: { name: row.authorName, handle: row.authorHandle },
	};
}

export type UnlockResult = "unlocked" | "wrong" | "locked";

// 限定公開のレシピを、パスフレーズで開ける。違う・存在しない・非公開は、どれも「wrong」で、同じように失敗に数える。
export async function attemptUnlock(
	db: DB,
	input: {
		viewerUserId: string;
		publicId: string;
		passphrase: string;
		secret: string;
		now: Date;
	},
): Promise<UnlockResult> {
	const since = new Date(input.now.getTime() - oneHourMs);
	const recentFailures = await db
		.select({ publicId: recipeUnlockAttempt.publicId })
		.from(recipeUnlockAttempt)
		.where(
			and(
				eq(recipeUnlockAttempt.userId, input.viewerUserId),
				gte(recipeUnlockAttempt.createdAt, since),
			),
		);

	if (
		isPassphraseLocked(
			recentFailures.filter((failure) => failure.publicId === input.publicId)
				.length,
		) ||
		recentFailures.length >= maxFailuresPerHourOverall
	) {
		return "locked";
	}

	const [target] = await db
		.select({
			id: recipe.id,
			visibility: recipe.visibility,
			passphrase: recipe.unlistedPassphrase,
		})
		.from(recipe)
		.where(eq(recipe.publicId, input.publicId))
		.limit(1);
	const expected =
		target?.passphrase &&
		parseRecipeVisibility(target.visibility) === "unlisted"
			? await decryptPassphrase(target.passphrase, input.secret)
			: null;
	const given = normalizePassphraseInput(input.passphrase);

	if (
		target &&
		expected !== null &&
		given !== "" &&
		given === normalizePassphraseInput(expected)
	) {
		await db
			.insert(recipeUnlock)
			.values({
				recipeId: target.id,
				userId: input.viewerUserId,
				unlockedAt: input.now,
			})
			.onConflictDoNothing();

		return "unlocked";
	}

	await db.insert(recipeUnlockAttempt).values({
		publicId: input.publicId,
		userId: input.viewerUserId,
		createdAt: input.now,
	});

	return "wrong";
}

// 直近1時間の失敗の数（テスト・確認用）。
export async function countRecentUnlockFailures(
	db: DB,
	viewerUserId: string,
	now: Date,
): Promise<number> {
	const [row] = await db
		.select({ total: count() })
		.from(recipeUnlockAttempt)
		.where(
			and(
				eq(recipeUnlockAttempt.userId, viewerUserId),
				gte(recipeUnlockAttempt.createdAt, new Date(now.getTime() - oneHourMs)),
			),
		);

	return row?.total ?? 0;
}
