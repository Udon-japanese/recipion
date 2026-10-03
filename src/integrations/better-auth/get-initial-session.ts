import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { createDb } from "#/db/client";
import { createAuth } from "#/integrations/better-auth/auth";
import type { InitialSession } from "#/integrations/better-auth/initial-session";

// ビルド時に静的シェルを作るリクエスト（scripts/postbuild-app-shell.ts）に付くヘッダー。
// TanStack Start の内部実装（start-server-core の HEADERS.TSS_SHELL）に依存している。
// TanStack Start を更新するときは、この名前が変わっていないか確認すること。
const SHELL_REQUEST_HEADER = "X-TSS_SHELL";

// 認可には使わない。初回の描画で、ログイン状態の表示がちらつかないようにするための値。
// シェルのリクエストでは undefined（サーバーの結果なし）を返し、誰のセッションも、ゲストの確定も焼き込まない。
export const getInitialSessionServerFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<InitialSession | null | undefined> => {
	if (getRequestHeaders().get(SHELL_REQUEST_HEADER) === "true") {
		return undefined;
	}

	const { db } = await createDb();
	const auth = createAuth(db);

	const session = await auth.api.getSession({
		headers: getRequestHeaders(),
	});

	if (!session) return null;

	// HTML に埋め込まれるので、表示に使う項目だけを明示的に取り出す。
	return {
		user: {
			id: session.user.id,
			name: session.user.name,
			email: session.user.email,
		},
	};
});
