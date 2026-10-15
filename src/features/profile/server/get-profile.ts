import { createServerFn } from "@tanstack/react-start";
import { UserFacingError } from "#/errors/user-facing-error";
import { createDrizzleProfileRepository } from "#/features/profile/infrastructure/drizzle-profile-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

// ログインしているユーザー本人のプロフィール。
export const getProfileServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db, userId } = await requireSession();
	const profile = await createDrizzleProfileRepository(db, userId).get();

	if (!profile) {
		throw new UserFacingError("ユーザーが見つかりませんでした");
	}

	return profile;
});
