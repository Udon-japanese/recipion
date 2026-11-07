import { rootRouteId, useLoaderData } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { authClient } from "#/integrations/better-auth/auth-client";
import { resolveSession } from "#/integrations/better-auth/initial-session";

// authClient.useSession() を、ルートの loader で確認したサーバー側のログイン状態で補う。
// 最初の取得が終わるまでの一瞬、ゲストや空白に見えるのを防ぐ。
export function useAppSession() {
	const { data, isPending, error, refetch } = authClient.useSession();
	const initialSession = useLoaderData({
		from: rootRouteId,
		select: (loaderData) => loaderData.initialSession,
	});
	const [hasSettled, setHasSettled] = useState(false);

	useEffect(() => {
		if (!isPending) setHasSettled(true);
	}, [isPending]);

	return {
		...resolveSession({ data, isPending }, initialSession, hasSettled),
		// ログイン状態を、サーバーに確かめられなかった（通信できないなど）。未ログイン（401）とは分ける。
		isUnconfirmed: error !== null && error.status !== 401,
		refetch,
	};
}
