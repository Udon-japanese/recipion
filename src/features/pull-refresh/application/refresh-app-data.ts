// 引っ張り更新で、画面の元データを取り直す（ルートの再読み込み・買い物メモの同期）。
// 途中の失敗は、ほかの取り直しを止めない（結果は見ずに、最後に通知だけする）。

type UserScope = `user:${string}`;

export function isUserScope(scope: string | null): scope is UserScope {
	return scope?.startsWith("user:") ?? false;
}

type RefreshAppDataInput = {
	// ルートの loader を、もう一度動かす（レシピの一覧など）。
	invalidateRoutes: () => Promise<void>;
	// 買い物メモの同期（ログインしている人のときだけ渡す）。
	syncShoppingMemo?: () => Promise<unknown>;
	// 取り直しが終わったことを、画面の部品に知らせる（在庫は、ルートの loader を使わないため）。
	notify: () => void;
};

export async function refreshAppData({
	invalidateRoutes,
	syncShoppingMemo,
	notify,
}: RefreshAppDataInput): Promise<void> {
	await Promise.allSettled([invalidateRoutes(), syncShoppingMemo?.()]);
	notify();
}
