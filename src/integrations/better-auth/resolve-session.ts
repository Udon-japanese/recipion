import { eq } from "drizzle-orm";

import { createDb } from "#/db/client";
import {
	ACCOUNT_CHANGED_MESSAGE,
	ACCOUNT_SUSPENDED_MESSAGE,
	AUTH_REQUIRED_MESSAGE,
	UserFacingError,
} from "#/errors/user-facing-error";
import { accountSuspension } from "#/features/moderation/infrastructure/moderation.sql";
import { createAuth } from "#/integrations/better-auth/auth";
import { checkExpectedUser } from "#/integrations/better-auth/expected-user";
import { hasSessionCredential } from "#/integrations/better-auth/session-cookie";

export type SessionOptions = {
	allowSuspended?: boolean;
	expectedUserId?: string;
};

// 認可の入口（サーバー関数と API の共通）。セッションを確認し、DB とユーザー ID を返す（なければ例外）。
// セッションの資格（Cookie か bearer）のないリクエスト（bot など）は、DB に接続する前に断る。
// 停止中のアカウントは、断る（停止の画面と申し立てのために、allowSuspended を付けたものだけが通す）。
// expectedUserId：画面が思っているユーザー。セッションのユーザーと違えば断る
// （名前で食材を決める書き込みと、キャッシュに入る一覧の読み込みで使う。食材の ID で書く操作は、別の人の ID が見つからないので要らない）。
export async function resolveSession(
	headers: Headers,
	options: SessionOptions = {},
) {
	if (!hasSessionCredential(headers)) {
		throw new UserFacingError(AUTH_REQUIRED_MESSAGE, { code: "AUTH_REQUIRED" });
	}

	const { db } = await createDb();
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers });

	if (!session) {
		throw new UserFacingError(AUTH_REQUIRED_MESSAGE, { code: "AUTH_REQUIRED" });
	}

	if (!checkExpectedUser(session.user.id, options.expectedUserId)) {
		throw new UserFacingError(ACCOUNT_CHANGED_MESSAGE, {
			code: "ACCOUNT_CHANGED",
		});
	}

	if (!options.allowSuspended) {
		const [suspension] = await db
			.select({ userId: accountSuspension.userId })
			.from(accountSuspension)
			.where(eq(accountSuspension.userId, session.user.id))
			.limit(1);

		if (suspension) {
			throw new UserFacingError(ACCOUNT_SUSPENDED_MESSAGE, {
				code: "ACCOUNT_SUSPENDED",
			});
		}
	}

	return { db, userId: session.user.id };
}

export type ResolvedSession = Awaited<ReturnType<typeof resolveSession>>;
