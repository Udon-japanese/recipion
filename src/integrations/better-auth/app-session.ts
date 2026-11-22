import { type Avatar, parseAvatar } from "#/features/avatar/domain/avatar";

// 画面が使う、ログイン中のユーザー（表示に使う最小限の項目だけ。トークンなどは含めない）。
export type AppSession = {
	user: {
		id: string;
		name: string;
		email: string;
		// 公開のハンドル（アカウントの削除の確認に使う）。
		handle: string | null;
		// null は、まだ作っていない（ユーザーごとに決まったプリセットを出す）。
		avatar: Avatar | null;
	};
};

type StoreSession = {
	data: {
		user: {
			id: string;
			name: string;
			email: string;
			handle?: string | null;
			avatar?: unknown;
		};
	} | null;
	isPending: boolean;
};

export type ResolvedSession = {
	data: AppSession | null;
	isPending: boolean;
};

// Better Auth のセッション（authClient.useSession）を、画面が使う形にする。
// 取得中（isPending）は、ログイン状態に頼る部分が、読み込み中の表示を出す。
export function toAppSession(store: StoreSession): ResolvedSession {
	return {
		data: store.data
			? {
					user: {
						id: store.data.user.id,
						name: store.data.user.name,
						email: store.data.user.email,
						handle: store.data.user.handle ?? null,
						avatar: parseAvatar(store.data.user.avatar),
					},
				}
			: null,
		isPending: store.isPending,
	};
}
