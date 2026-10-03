// サーバーで確認したセッションのうち、表示に使う最小限の項目だけ。
// SSR の HTML に埋め込まれるため、トークンなどは含めない。
export type InitialSession = {
	user: {
		id: string;
		name: string;
		email: string;
	};
};

type StoreSession = {
	data: { user: { id: string; name: string; email: string } } | null;
	isPending: boolean;
};

export type ResolvedSession = {
	data: InitialSession | null;
	isPending: boolean;
};

// サーバーの確認結果を、クライアントのセッション取得が終わるまでの表示に使う。
// initialSession: undefined = サーバーの結果がない、null = サーバーが未ログインと確認した、値 = ログイン中。
// hasSettled: ストアが一度でも取得を終えた（isPending が false になった）か。
// 最初の取得は、開始と同時に isPending と isRefetching が両方 true になるため、isRefetching では見分けられない。
// 取得を終えたあと（ログイン直後の再取得など）は、サーバーの古い値ではなく、ストアの状態を使う。
export function resolveSession(
	store: StoreSession,
	initialSession: InitialSession | null | undefined,
	hasSettled: boolean,
): ResolvedSession {
	if (store.isPending && !hasSettled && initialSession !== undefined) {
		return { data: initialSession, isPending: false };
	}

	return {
		data: store.data
			? {
					user: {
						id: store.data.user.id,
						name: store.data.user.name,
						email: store.data.user.email,
					},
				}
			: null,
		isPending: store.isPending,
	};
}
