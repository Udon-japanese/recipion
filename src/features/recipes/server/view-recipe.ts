import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

import { requireSession } from "#/integrations/better-auth/require-session";
import {
	attemptUnlock,
	findViewableRecipe,
} from "../infrastructure/drizzle-recipe-viewer-repository";

const publicIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(100));

// 見てよいレシピ（自分のレシピ、全体公開、パスフレーズで開けた限定公開）。
// 見てはいけないものと、存在しないものは、どちらも null。
export const viewRecipeServerFn = createServerFn({ method: "GET" })
	.validator((input) => v.parse(v.object({ publicId: publicIdSchema }), input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return findViewableRecipe(db, userId, data.publicId);
	});

// 限定公開のレシピを、パスフレーズで開ける。違う・存在しない・非公開は、どれも同じ「wrong」。
export const unlockRecipeServerFn = createServerFn({ method: "POST" })
	.validator((input) =>
		v.parse(
			v.object({
				publicId: publicIdSchema,
				passphrase: v.pipe(v.string(), v.maxLength(200)),
			}),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return attemptUnlock(db, {
			viewerUserId: userId,
			publicId: data.publicId,
			passphrase: data.passphrase,
			secret: env.BETTER_AUTH_SECRET,
			now: new Date(),
		});
	});
