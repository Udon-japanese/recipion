import { and, desc, eq, ne, sql } from "drizzle-orm";

import type { DB } from "#/db/client";
import { user } from "#/integrations/better-auth/auth.sql";
import type {
	LinkableUser,
	OtherRecipeTarget,
} from "../domain/other-recipe-links";
import { recipe } from "./recipe.sql";

export const maxLinkableUsers = 10;
export const maxLinkableRecipes = 50;

// LIKE の特殊文字（% _ \）を、そのままの文字として扱う。
function escapeLike(text: string): string {
	return text.replace(/[\\%_]/gu, (char) => `\\${char}`);
}

// リンクできるユーザー：全体公開のレシピを1つ以上持つ、自分以外の人。ハンドルか表示名の前方一致。
// 入力が空なら、最近公開した人。メールアドレスは、返さない。
export async function searchLinkableUsers(
	db: DB,
	viewerUserId: string,
	query: string,
): Promise<LinkableUser[]> {
	const trimmed = query.trim().slice(0, 50);
	const pattern = `${escapeLike(trimmed)}%`;
	const rows = await db
		.select({
			handle: user.handle,
			name: user.name,
			latest: sql<Date>`max(${recipe.createdAt})`,
		})
		.from(user)
		.innerJoin(recipe, eq(recipe.userId, user.id))
		.where(
			and(
				eq(recipe.visibility, "public"),
				ne(user.id, viewerUserId),
				trimmed === ""
					? undefined
					: sql`(${user.handle} ILIKE ${pattern} OR ${user.name} ILIKE ${pattern})`,
			),
		)
		.groupBy(user.id, user.handle, user.name)
		.orderBy(desc(sql`max(${recipe.createdAt})`))
		.limit(maxLinkableUsers);

	return rows.map((row) => ({ handle: row.handle, name: row.name }));
}

// そのユーザーの、全体公開のレシピ（新しい順）。自分のレシピは、含めない（自分のレシピは、別の経路で選べる）。
export async function listPublicRecipesOfUser(
	db: DB,
	viewerUserId: string,
	handle: string,
): Promise<OtherRecipeTarget[]> {
	const rows = await db
		.select({
			publicId: recipe.publicId,
			name: recipe.name,
			createdAt: recipe.createdAt,
			authorName: user.name,
			authorHandle: user.handle,
		})
		.from(recipe)
		.innerJoin(user, eq(user.id, recipe.userId))
		.where(
			and(
				eq(user.handle, handle),
				ne(user.id, viewerUserId),
				eq(recipe.visibility, "public"),
			),
		)
		.orderBy(desc(recipe.createdAt))
		.limit(maxLinkableRecipes);

	return rows.map((row) => ({
		publicId: row.publicId,
		name: row.name,
		createdAt: row.createdAt.toISOString(),
		authorName: row.authorName,
		authorHandle: row.authorHandle,
	}));
}
