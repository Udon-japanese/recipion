import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { updateProfile } from "#/features/profile/application/update-profile";
import { createDrizzleProfileRepository } from "#/features/profile/infrastructure/drizzle-profile-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

// 長すぎる入力は、検証の前に断る（中身の検証は、updateProfile が行う）。
const updateProfileInputSchema = v.object({
	name: v.pipe(v.string(), v.maxLength(200)),
	handle: v.pipe(v.string(), v.maxLength(100)),
});

// ログインしているユーザー本人の、表示名とハンドルを更新する。
export const updateProfileServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => v.parse(updateProfileInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();

		return updateProfile(createDrizzleProfileRepository(db, userId), data);
	});
