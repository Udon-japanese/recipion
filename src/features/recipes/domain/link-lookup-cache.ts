import type { LinkableUser, OtherRecipeTarget } from "./other-recipe-links";

// 他の人のレシピへのリンクで、サーバーに聞いた結果を、しばらく覚えておく（本文の [[@ の補完と、リンクを選ぶシートで共有する）。
// 同じ問い合わせは、期限（既定 5 分）までは、サーバーに聞き直さない。同時に同じ問い合わせが来ても、1回にまとめる。
// 失敗した結果は、覚えない（次に、もう一度聞く）。他の人が公開・非公開を替えても、期限がくるか refresh するまでは、反映されない。
// 時刻は引数で注入できる（テスト用）。

export type LinkLookupCacheOptions = {
	searchUsers: (query: string) => Promise<LinkableUser[]>;
	loadUserRecipes: (handle: string) => Promise<OtherRecipeTarget[]>;
	ttlMs?: number;
	now?: () => number;
};

export const defaultLinkLookupTtlMs = 5 * 60 * 1000;

type Entry<Value> = { promise: Promise<Value>; loadedAt: number | null };

export function createLinkLookupCache({
	searchUsers,
	loadUserRecipes,
	ttlMs = defaultLinkLookupTtlMs,
	now = () => Date.now(),
}: LinkLookupCacheOptions) {
	const users = new Map<string, Entry<LinkableUser[]>>();
	const recipes = new Map<string, Entry<OtherRecipeTarget[]>>();

	function lookup<Value>(
		store: Map<string, Entry<Value>>,
		key: string,
		fetcher: (key: string) => Promise<Value>,
	): Promise<Value> {
		const existing = store.get(key);

		// 取得中（loadedAt なし）か、期限内なら、それを使う。
		if (
			existing &&
			(existing.loadedAt === null || now() - existing.loadedAt < ttlMs)
		) {
			return existing.promise;
		}

		const entry: Entry<Value> = {
			promise: fetcher(key).then(
				(value) => {
					entry.loadedAt = now();

					return value;
				},
				(error: unknown) => {
					// 失敗は覚えない。ただし、すでに別の問い合わせに替わっていたら、触らない。
					if (store.get(key) === entry) {
						store.delete(key);
					}

					throw error;
				},
			),
			loadedAt: null,
		};

		store.set(key, entry);

		return entry.promise;
	}

	return {
		searchUsers: (query: string) => lookup(users, query, searchUsers),
		loadUserRecipes: (handle: string) =>
			lookup(recipes, handle, loadUserRecipes),
		// 覚えたものを、すべて捨てる（次の問い合わせから、サーバーに聞く）。
		refresh() {
			users.clear();
			recipes.clear();
		},
	};
}

export type LinkLookupCache = ReturnType<typeof createLinkLookupCache>;
