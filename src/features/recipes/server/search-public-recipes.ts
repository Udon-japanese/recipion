import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { requireSession } from "#/integrations/better-auth/require-session";
import {
	maxSearchQueryLength,
	parseRecipeSearchTerms,
	parseSearchTags,
} from "../domain/public-recipe-search";
import { searchPublicRecipes } from "../infrastructure/drizzle-public-recipe-search";
import { assertWithinSearchLimit } from "./search-rate-limit";

// みんなのレシピ（全体公開）の一覧と検索。ログインしたユーザーだけ。
export const searchPublicRecipesServerFn = createServerFn({ method: "GET" })
	.validator((input) =>
		v.parse(
			v.object({
				query: v.pipe(v.string(), v.maxLength(maxSearchQueryLength)),
				cursor: v.optional(v.pipe(v.string(), v.maxLength(100))),
				// 公開用のタグのキー（語の一覧にないものは、無視する）。
				tags: v.optional(
					v.pipe(v.array(v.pipe(v.string(), v.maxLength(40))), v.maxLength(20)),
				),
			}),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		await assertWithinSearchLimit(userId);

		return searchPublicRecipes(
			db,
			userId,
			parseRecipeSearchTerms(data.query),
			data.cursor ?? null,
			parseSearchTags(data.tags ?? []),
		);
	});
