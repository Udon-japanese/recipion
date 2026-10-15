import { getRequestHeaders } from "@tanstack/react-start/server";

import { eq } from "drizzle-orm";

import { createDb } from "#/db/client";
import { UserFacingError } from "#/errors/user-facing-error";
import { accountSuspension } from "#/features/moderation/infrastructure/moderation.sql";
import { createAuth } from "#/integrations/better-auth/auth";
import { hasSessionCookie } from "#/integrations/better-auth/session-cookie";

// サーバー関数の認可の入口。セッションを確認し、DB とユーザー ID を返す（なければ例外）。
// セッション Cookie のないリクエスト（bot など）は、DB に接続する前に断る。
// 停止中のアカウントは、断る（停止の画面と申し立てのために、allowSuspended を付けた関数だけが通す）。
export async function requireSession(
	options: { allowSuspended?: boolean } = {},
) {
	const headers = getRequestHeaders();

	if (!hasSessionCookie(headers.get("cookie"))) {
		throw new UserFacingError("認証が必要です");
	}

	const { db } = await createDb();
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers });

	if (!session) {
		throw new UserFacingError("認証が必要です");
	}

	if (!options.allowSuspended) {
		const [suspension] = await db
			.select({ userId: accountSuspension.userId })
			.from(accountSuspension)
			.where(eq(accountSuspension.userId, session.user.id))
			.limit(1);

		if (suspension) {
			throw new UserFacingError("アカウントが停止されています");
		}
	}

	return { db, userId: session.user.id };
}
