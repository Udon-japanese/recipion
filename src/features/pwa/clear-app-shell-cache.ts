// public/sw.js の SHELL_CACHE と同じ名前にすること。
export const APP_SHELL_CACHE_NAME = "recipion-shell-v1";

// サービスワーカーがキャッシュするアプリのシェルは、ユーザーごとの HTML（ログイン中のユーザーの表示項目を含む）。
// 同じブラウザを使う別のユーザーに見えないよう、ログイン・ログアウトのたびに消す。
// 次にオンラインで開いたとき、サービスワーカーが改めてキャッシュする。
export async function clearAppShellCache(
	cacheStorage: Pick<CacheStorage, "delete"> | undefined = typeof caches ===
	"undefined"
		? undefined
		: caches,
): Promise<void> {
	if (!cacheStorage) return;

	try {
		await cacheStorage.delete(APP_SHELL_CACHE_NAME);
	} catch {
		// キャッシュを消せなくても、ログイン・ログアウト自体は妨げない。
	}
}
