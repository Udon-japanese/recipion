import { getRequestHeaders } from "@tanstack/react-start/server";

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
import { hasSessionCookie } from "#/integrations/better-auth/session-cookie";

// サーバー関数の認可の入口。セッションを確認し、DB とユーザー ID を返す（なければ例外）。
// セッション Cookie のないリクエスト（bot など）は、DB に接続する前に断る。
// 停止中のアカウントは、断る（停止の画面と申し立てのために、allowSuspended を付けた関数だけが通す）。
// expectedUserId：画面が思っているユーザー。Cookie のユーザーと違えば断る
// （名前で食材を決める書き込みと、キャッシュに入る一覧の読み込みで使う。食材の ID で書く操作は、別の人の ID が見つからないので要らない）。
export async function requireSession(
	options: { allowSuspended?: boolean; expectedUserId?: string } = {},
) {
	const headers = getRequestHeaders();

	if (!hasSessionCookie(headers.get("cookie"))) {
		throw new UserFacingError(AUTH_REQUIRED_MESSAGE);
	}

	const { db } = await createDb();
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers });

	if (!session) {
		throw new UserFacingError(AUTH_REQUIRED_MESSAGE);
	}

	if (!checkExpectedUser(session.user.id, options.expectedUserId)) {
		throw new UserFacingError(ACCOUNT_CHANGED_MESSAGE);
	}

	if (!options.allowSuspended) {
		const [suspension] = await db
			.select({ userId: accountSuspension.userId })
			.from(accountSuspension)
			.where(eq(accountSuspension.userId, session.user.id))
			.limit(1);

		if (suspension) {
			throw new UserFacingError(ACCOUNT_SUSPENDED_MESSAGE);
		}
	}

	return { db, userId: session.user.id };
}
