import { eq } from "drizzle-orm";

import { UserFacingError } from "#/errors/user-facing-error";
import type { Avatar } from "#/features/avatar/domain/avatar";
import { enforceModeration } from "#/features/moderation/server/enforce-moderation";
import { user } from "#/integrations/better-auth/auth.sql";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import {
	type ProfileFieldErrors,
	updateProfile,
} from "../application/update-profile";
import { createDrizzleProfileRepository } from "../infrastructure/drizzle-profile-repository";

// 本人の API（/api/v1/me）の中身。入口の形の確認は me-routes.ts。
export function createMeOperations({ db, userId }: ResolvedSession) {
	const profiles = createDrizzleProfileRepository(db, userId);

	return {
		async getProfile() {
			const profile = await profiles.get();

			if (!profile) {
				throw new UserFacingError("ユーザーが見つかりませんでした", {
					code: "NOT_FOUND",
				});
			}

			return profile;
		},

		// 表示名とハンドルを更新する。断るときは、欄ごとの文を返す（例外にしない。フォームに出すため）。
		updateProfile: (input: { name: string; handle: string }) =>
			updateProfile(profiles, input, async (changes) => {
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
			}),

		// アバターを保存する（null は、ユーザーごとに決まったプリセットに戻す）。
		// 決まった部品・決まった背景の組み合わせだけなので、文章の審査（AI）の対象にしない。
		async updateAvatar(avatar: Avatar | null) {
			await db.update(user).set({ avatar }).where(eq(user.id, userId));

			return { avatar };
		},
	};
}

export type MeOperations = ReturnType<typeof createMeOperations>;
