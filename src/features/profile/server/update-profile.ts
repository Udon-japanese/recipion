import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { enforceModeration } from "#/features/moderation/server/enforce-moderation";
import {
	type ProfileFieldErrors,
	updateProfile,
} from "#/features/profile/application/update-profile";
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

		return updateProfile(
			createDrizzleProfileRepository(db, userId),
			data,
			async (changes) => {
				const enforcement = await enforceModeration(db, userId, [
					...(changes.name !== undefined
						? [{ target: "profile-display-name" as const, text: changes.name }]
						: []),
					...(changes.handle !== undefined
						? [{ target: "profile-handle" as const, text: changes.handle }]
						: []),
				]);

				if (enforcement.status === "allowed") {
					return null;
				}

				// 断る原因の欄に、その文を出す。欄が決まらない理由（停止中・上限など）は、フォーム全体に出す。
				const errors: ProfileFieldErrors = {};

				if (enforcement.targets.includes("profile-display-name")) {
					errors.name = enforcement.message;
				}

				if (enforcement.targets.includes("profile-handle")) {
					errors.handle = enforcement.message;
				}

				return Object.keys(errors).length > 0
					? errors
					: { form: enforcement.message };
			},
		);
	});
