import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { createDb } from "#/db/client";
import { createAuth } from "#/integrations/better-auth/auth";
import type { InitialSession } from "#/integrations/better-auth/initial-session";

// 認可には使わない。初回の描画で、ログイン状態の表示がちらつかないようにするための値。
export const getInitialSessionServerFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<InitialSession | null> => {
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
