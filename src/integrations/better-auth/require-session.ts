import { getRequestHeaders } from "@tanstack/react-start/server";

import { createDb } from "#/db/client";
import { createAuth } from "#/integrations/better-auth/auth";
import { hasSessionCookie } from "#/integrations/better-auth/session-cookie";

// サーバー関数の認可の入口。セッションを確認し、DB とユーザー ID を返す（なければ例外）。
// セッション Cookie のないリクエスト（bot など）は、DB に接続する前に断る。
export async function requireSession() {
	const headers = getRequestHeaders();

	if (!hasSessionCookie(headers.get("cookie"))) {
		throw new Error("認証が必要です");
	}

	const { db } = await createDb();
	const auth = createAuth(db);
	const session = await auth.api.getSession({ headers });

	if (!session) {
		throw new Error("認証が必要です");
	}

	return { db, userId: session.user.id };
}
