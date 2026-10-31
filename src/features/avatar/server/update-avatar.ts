import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as v from "valibot";
import { user } from "#/integrations/better-auth/auth.sql";
import { requireSession } from "#/integrations/better-auth/require-session";
import { avatarSchema } from "../domain/avatar";

// null は、作ったアバターを消して、ユーザーごとに決まったプリセットに戻す。
const updateAvatarInputSchema = v.object({
	avatar: v.nullable(avatarSchema),
});

// ログインしているユーザー本人の、アバターを保存する。
// 決まった部品・決まった背景の組み合わせだけなので、文章の審査（AI）の対象にしない。
export const updateAvatarServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => v.parse(updateAvatarInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		await db
			.update(user)
			.set({ avatar: data.avatar })
			.where(eq(user.id, userId));

		return { avatar: data.avatar };
	});
