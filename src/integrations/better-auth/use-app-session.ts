import { toAppSession } from "#/integrations/better-auth/app-session";
import { authClient } from "#/integrations/better-auth/auth-client";

// ログイン中のユーザー（表示の切り替え用。認可は、API が自分で確かめる）。
export function useAppSession() {
	const { data, isPending, error, refetch } = authClient.useSession();

	return {
		...toAppSession({ data, isPending }),
		// ログイン状態を、サーバーに確かめられなかった（通信できないなど）。未ログイン（401）とは分ける。
		isUnconfirmed: error !== null && error.status !== 401,
		refetch,
	};
}
