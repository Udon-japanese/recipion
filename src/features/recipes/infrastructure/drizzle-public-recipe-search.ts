import {
	and,
	desc,
	eq,
	exists,
	ne,
	notExists,
	or,
	type SQL,
	sql,
} from "drizzle-orm";

import type { DB } from "#/db/client";
import { accountSuspension } from "#/features/moderation/infrastructure/moderation.sql";
import { user } from "#/integrations/better-auth/auth.sql";
import {
	buildLikePatterns,
	formatSearchCursor,
	type PublicRecipePage,
	parseSearchCursor,
	publicRecipePageSize,
} from "../domain/public-recipe-search";
import { recipe, recipeIngredientNode } from "./recipe.sql";

// 全体公開のレシピを、新しい順に探す。自分のレシピ・停止中のユーザーのレシピは含めない。
// 検索語（複数なら、すべてに当たるもの）は、レシピ名か材料名の部分一致。
export async function searchPublicRecipes(
	db: DB,
	viewerUserId: string,
	terms: readonly string[],
	cursor: string | null,
): Promise<PublicRecipePage> {
	const parsedCursor = cursor === null ? null : parseSearchCursor(cursor);

	const termConditions = terms.map((term): SQL | undefined => {
		const patterns = buildLikePatterns(term);

		return or(
			or(...patterns.map((pattern) => sql`${recipe.name} ILIKE ${pattern}`)),
			exists(
				db
					.select({ one: sql`1` })
					.from(recipeIngredientNode)
					.where(
						and(
							eq(recipeIngredientNode.recipeId, recipe.id),
							or(
								...patterns.map(
									(pattern) =>
										sql`${recipeIngredientNode.name} ILIKE ${pattern}`,
								),
							),
						),
					),
			),
		);
	});

	const rows = await db
		.select({
			publicId: recipe.publicId,
			name: recipe.name,
			servings: recipe.servings,
			createdAtText: sql<string>`${recipe.createdAt}::text`,
			createdAt: recipe.createdAt,
			authorName: user.name,
			authorHandle: user.handle,
			ingredientCount: sql<number>`(
				select count(*)::int from ${recipeIngredientNode}
				where ${recipeIngredientNode.recipeId} = ${recipe.id}
				and ${recipeIngredientNode.type} = 'ingredient'
			)`,
		})
		.from(recipe)
		.innerJoin(user, eq(user.id, recipe.userId))
		.where(
			and(
				eq(recipe.visibility, "public"),
				ne(recipe.userId, viewerUserId),
				notExists(
					db
						.select({ one: sql`1` })
						.from(accountSuspension)
						.where(eq(accountSuspension.userId, recipe.userId)),
				),
				...termConditions,
				parsedCursor
					? sql`(${recipe.createdAt}, ${recipe.publicId}) < (${parsedCursor.createdAt}::timestamptz, ${parsedCursor.publicId})`
					: undefined,
			),
		)
		.orderBy(desc(recipe.createdAt), desc(recipe.publicId))
		.limit(publicRecipePageSize + 1);

	const pageRows = rows.slice(0, publicRecipePageSize);
	const last = pageRows.at(-1);

	return {
		recipes: pageRows.map((row) => ({
			publicId: row.publicId,
			name: row.name,
			servings: Number(row.servings),
			ingredientCount: row.ingredientCount,
			createdAt: row.createdAt.toISOString(),
			authorName: row.authorName,
			authorHandle: row.authorHandle,
		})),
		nextCursor:
			rows.length > publicRecipePageSize && last
				? formatSearchCursor({
						createdAt: last.createdAtText,
						publicId: last.publicId,
					})
				: null,
	};
}
