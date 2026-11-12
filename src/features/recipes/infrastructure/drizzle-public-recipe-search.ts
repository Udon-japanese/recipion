import {
	and,
	arrayContains,
	arrayOverlaps,
	desc,
	eq,
	exists,
	inArray,
	ne,
	notExists,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
import type { DB } from "#/db/client";
import { resolveUserAvatar } from "#/features/avatar/domain/avatar-presets";
import { parseDishCover } from "#/features/dish-art/domain/dish-cover";
import { accountSuspension } from "#/features/moderation/infrastructure/moderation.sql";
import { user } from "#/integrations/better-auth/auth.sql";
import { restoreRecipeIngredients } from "../application/restore-recipe-ingredients";
import { previewIngredients } from "../domain/ingredient-preview";
import {
	buildLikePatterns,
	findPublicTagsMatchingTerm,
	formatSearchCursor,
	type PublicRecipePage,
	parseSearchCursor,
	publicRecipePageSize,
} from "../domain/public-recipe-search";
import type { PublicRecipeTag } from "../domain/recipe-tags";
import { toStoredIngredientNode } from "./drizzle-recipe-repository";
import { recipe, recipeIngredientNode } from "./recipe.sql";

// 全体公開のレシピを、新しい順に探す。自分のレシピ・停止中のユーザーのレシピは含めない。
// 検索語（複数なら、すべてに当たるもの）は、レシピ名か材料名の部分一致か、表示名に語を含む公開用のタグ。
// tags：選んだ公開用のタグを、すべて持つもの。
export async function searchPublicRecipes(
	db: DB,
	viewerUserId: string,
	terms: readonly string[],
	cursor: string | null,
	tags: readonly PublicRecipeTag[] = [],
): Promise<PublicRecipePage> {
	const parsedCursor = cursor === null ? null : parseSearchCursor(cursor);

	const termConditions = terms.map((term): SQL | undefined => {
		const patterns = buildLikePatterns(term);
		const matchingTags = findPublicTagsMatchingTerm(term);

		return or(
			matchingTags.length > 0
				? arrayOverlaps(recipe.publicTags, matchingTags)
				: undefined,
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
			id: recipe.id,
			publicId: recipe.publicId,
			name: recipe.name,
			yieldText: recipe.yieldText,
			cover: recipe.cover,
			publicTags: recipe.publicTags,
			createdAtText: sql<string>`${recipe.createdAt}::text`,
			createdAt: recipe.createdAt,
			authorName: user.name,
			authorHandle: user.handle,
			authorId: user.id,
			authorAvatar: user.avatar,
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
				tags.length > 0
					? arrayContains(recipe.publicTags, [...tags])
					: undefined,
				parsedCursor
					? sql`(${recipe.createdAt}, ${recipe.publicId}) < (${parsedCursor.createdAt}::timestamptz, ${parsedCursor.publicId})`
					: undefined,
			),
		)
		.orderBy(desc(recipe.createdAt), desc(recipe.publicId))
		.limit(publicRecipePageSize + 1);

	const pageRows = rows.slice(0, publicRecipePageSize);
	const last = pageRows.at(-1);
	// カードの材料のちょい見せ：このページのレシピの材料を、まとめて1回で取る。
	const ingredientRows =
		pageRows.length === 0
			? []
			: await db
					.select()
					.from(recipeIngredientNode)
					.where(
						inArray(
							recipeIngredientNode.recipeId,
							pageRows.map((row) => row.id),
						),
					);
	const ingredientRowsByRecipe = new Map<string, typeof ingredientRows>();

	for (const row of ingredientRows) {
		ingredientRowsByRecipe.set(row.recipeId, [
			...(ingredientRowsByRecipe.get(row.recipeId) ?? []),
			row,
		]);
	}

	return {
		recipes: pageRows.map((row) => ({
			publicId: row.publicId,
			name: row.name,
			yieldText: row.yieldText,
			cover: parseDishCover(row.cover),
			publicTags: row.publicTags,
			ingredientPreview: previewIngredients(
				restoreRecipeIngredients(
					(ingredientRowsByRecipe.get(row.id) ?? []).map(
						toStoredIngredientNode,
					),
				),
			),
			createdAt: row.createdAt.toISOString(),
			authorName: row.authorName,
			authorHandle: row.authorHandle,
			authorAvatar: resolveUserAvatar(row.authorId, row.authorAvatar),
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
