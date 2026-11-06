import { and, count, eq, gte } from "drizzle-orm";

import type { DB } from "#/db/client";
import type { Avatar } from "#/features/avatar/domain/avatar";
import { resolveUserAvatar } from "#/features/avatar/domain/avatar-presets";
import { user } from "#/integrations/better-auth/auth.sql";
import type { RecipeDetail } from "../application/recipe-repository";
import {
	isPassphraseLocked,
	normalizePassphraseInput,
} from "../domain/passphrase";
import type { RecipeDates } from "../domain/recipe-cook-log";
import { parseRecipeVisibility } from "../domain/recipe-link-permission";
import {
	createRecipeSnapshot,
	findChangedSnapshotSections,
	parseRecipeSnapshot,
	type RecipeSnapshot,
	type RecipeSnapshotSection,
} from "../domain/recipe-snapshot";
import { loadRecipeDetail } from "./drizzle-recipe-repository";
import { decryptPassphrase } from "./passphrase-cipher";
import { recipe, recipeUnlock, recipeUnlockAttempt } from "./recipe.sql";

const oneHourMs = 60 * 60 * 1000;
// 1人が、1時間に、どのレシピでも合わせて失敗してよい回数（存在しない ID を、次々に試す探りを止める）。
const maxFailuresPerHourOverall = 20;

export type ViewableRecipe = {
	recipe: RecipeDetail;
	isOwn: boolean;
	dates: RecipeDates;
	// 作者の、公開される名前とアバター（メールアドレス・ユーザーの id は含めない）。
	author: { name: string; handle: string; avatar: Avatar };
	// もとにしたレシピ（継承していなければ null）。
	parent: RecipeParentInfo | null;
};

// もとにしたレシピの、見る人にとっての様子。
export type RecipeParentInfo =
	| {
			status: "visible";
			publicId: string;
			name: string;
			// 親の作者（見る人自身のレシピなら null）。
			authorName: string | null;
			// 写したあとに親で変わった部分（子の持ち主にだけ。ほかの人には空）。
			changedSections: RecipeSnapshotSection[];
	  }
	// 見つからない（見る人が見られない・もうない）。どちらかは、区別しない（親の様子を、推測させない）。
	| { status: "missing" };

// 継承の情報。子の持ち主には、写しと今の親を比べた、変わった部分も返す。
async function loadParentInfo(
	db: DB,
	viewerUserId: string,
	child: typeof recipe.$inferSelect,
): Promise<RecipeParentInfo | null> {
	const snapshot = parseRecipeSnapshot(child.parentSnapshot);

	if (!snapshot) {
		return null;
	}

	if (child.parentRecipeId === null) {
		return { status: "missing" };
	}

	const [parent] = await db
		.select({ recipe, authorName: user.name })
		.from(recipe)
		.innerJoin(user, eq(user.id, recipe.userId))
		.where(eq(recipe.id, child.parentRecipeId))
		.limit(1);

	if (!parent || !(await canViewRecipe(db, viewerUserId, parent.recipe))) {
		return { status: "missing" };
	}

	const changedSections =
		child.userId === viewerUserId
			? findChangedSnapshotSections(
					snapshot,
					createRecipeSnapshot(
						await loadRecipeDetail(db, parent.recipe, viewerUserId),
					),
				)
			: [];

	return {
		status: "visible",
		publicId: parent.recipe.publicId,
		name: parent.recipe.name,
		authorName:
			parent.recipe.userId === viewerUserId ? null : parent.authorName,
		changedSections,
	};
}

// 見る人（viewerUserId）が、そのレシピを見てよいか。自分のレシピ、全体公開、パスフレーズで開けた限定公開。
export async function canViewRecipe(
	db: DB,
	viewerUserId: string,
	target: Pick<typeof recipe.$inferSelect, "id" | "userId" | "visibility">,
): Promise<boolean> {
	const visibility = parseRecipeVisibility(target.visibility);

	if (target.userId === viewerUserId || visibility === "public") {
		return true;
	}

	if (visibility !== "unlisted") {
		return false;
	}

	const [unlocked] = await db
		.select({ recipeId: recipeUnlock.recipeId })
		.from(recipeUnlock)
		.where(
			and(
				eq(recipeUnlock.recipeId, target.id),
				eq(recipeUnlock.userId, viewerUserId),
			),
		)
		.limit(1);

	return unlocked !== undefined;
}

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
			authorAvatar: user.avatar,
		})
		.from(recipe)
		.innerJoin(user, eq(user.id, recipe.userId))
		.where(eq(recipe.publicId, publicId))
		.limit(1);

	if (!row) {
		return null;
	}

	const isOwn = row.recipe.userId === viewerUserId;

	if (!(await canViewRecipe(db, viewerUserId, row.recipe))) {
		return null;
	}

	const [detail, parent] = await Promise.all([
		loadRecipeDetail(db, row.recipe, viewerUserId),
		loadParentInfo(db, viewerUserId, row.recipe),
	]);

	return {
		recipe: isOwn
			? detail
			: {
					...detail,
					author: { name: row.authorName, handle: row.authorHandle },
				},
		isOwn,
		dates: {
			createdAt: row.recipe.createdAt.toISOString(),
			publishedAt: row.recipe.publishedAt?.toISOString() ?? null,
			updatedAt: row.recipe.updatedAt.toISOString(),
		},
		author: {
			name: row.authorName,
			handle: row.authorHandle,
			avatar: resolveUserAvatar(row.recipe.userId, row.authorAvatar),
		},
		parent,
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

// 「このレシピをもとに作る」の親：見てよく、自分のレシピか全体公開のレシピ（限定公開の他の人のレシピは、子を公開すると中身が出てしまうので、できない）。
// できなければ null（存在しない・見てはいけないも、同じ）。
export async function findForkableParent(
	db: DB,
	viewerUserId: string,
	publicId: string,
): Promise<{ id: string; detail: RecipeDetail } | null> {
	const [found] = await db
		.select()
		.from(recipe)
		.where(eq(recipe.publicId, publicId))
		.limit(1);

	if (
		!found ||
		!(
			found.userId === viewerUserId ||
			parseRecipeVisibility(found.visibility) === "public"
		)
	) {
		return null;
	}

	return {
		id: found.id,
		detail: await loadRecipeDetail(db, found, viewerUserId),
	};
}

export type ParentMergeSource = {
	parentPublicId: string;
	parentName: string;
	// 親の作者（自分のレシピなら null）。
	parentAuthorName: string | null;
	// 写したとき（前に取り込んだとき）の親と、今の親。
	base: RecipeSnapshot;
	current: RecipeSnapshot;
};

// 自分の子のレシピ（childPublicId）の、親の変更を取り込むための材料。継承していない・親を見られない・消えたときは null。
export async function loadParentMergeSource(
	db: DB,
	userId: string,
	childPublicId: string,
): Promise<ParentMergeSource | null> {
	const [child] = await db
		.select({
			parentRecipeId: recipe.parentRecipeId,
			parentSnapshot: recipe.parentSnapshot,
		})
		.from(recipe)
		.where(and(eq(recipe.publicId, childPublicId), eq(recipe.userId, userId)))
		.limit(1);
	const base = parseRecipeSnapshot(child?.parentSnapshot);

	if (!child?.parentRecipeId || !base) {
		return null;
	}

	const [parent] = await db
		.select({ recipe, authorName: user.name })
		.from(recipe)
		.innerJoin(user, eq(user.id, recipe.userId))
		.where(eq(recipe.id, child.parentRecipeId))
		.limit(1);

	if (!parent || !(await canViewRecipe(db, userId, parent.recipe))) {
		return null;
	}

	return {
		parentPublicId: parent.recipe.publicId,
		parentName: parent.recipe.name,
		parentAuthorName:
			parent.recipe.userId === userId ? null : parent.authorName,
		base,
		current: createRecipeSnapshot(
			await loadRecipeDetail(db, parent.recipe, userId),
		),
	};
}
