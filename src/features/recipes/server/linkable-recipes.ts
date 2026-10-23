import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { requireSession } from "#/integrations/better-auth/require-session";
import {
	listPublicRecipesOfUser,
	searchLinkableUsers,
} from "../infrastructure/drizzle-linkable-recipes";
import { assertWithinSearchLimit } from "./search-rate-limit";

// 他の人のレシピへのリンクのための、ユーザーの検索（全体公開のレシピを持つ人だけ。ハンドルか表示名の前方一致）。
export const searchLinkableUsersServerFn = createServerFn({ method: "GET" })
	.validator((input) =>
		v.parse(v.object({ query: v.pipe(v.string(), v.maxLength(100)) }), input),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		await assertWithinSearchLimit(userId);

		return searchLinkableUsers(db, userId, data.query);
	});

// そのユーザーの、全体公開のレシピの一覧。
export const listUserPublicRecipesServerFn = createServerFn({ method: "GET" })
	.validator((input) =>
		v.parse(
			v.object({ handle: v.pipe(v.string(), v.minLength(1), v.maxLength(40)) }),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		await assertWithinSearchLimit(userId);

		return listPublicRecipesOfUser(db, userId, data.handle);
	});
