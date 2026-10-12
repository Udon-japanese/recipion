import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

import { requireSession } from "#/integrations/better-auth/require-session";
import {
	listPublicRecipesOfUser,
	searchLinkableUsers,
} from "../infrastructure/drizzle-linkable-recipes";

// ユーザーの検索の回数の制限（1人あたり、1分に決まった回数）。バインディングがない開発サーバーでは、制限しない。
async function assertWithinSearchLimit(userId: string): Promise<void> {
	const limiter = (env as { LINK_SEARCH_LIMITER?: RateLimit })
		.LINK_SEARCH_LIMITER;

	if (limiter && !(await limiter.limit({ key: userId })).success) {
		throw new Error("検索の回数が多すぎます。少し待ってから、お試しください。");
	}
}

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
