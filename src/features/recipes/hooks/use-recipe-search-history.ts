import {
	type HistoryState,
	useHydrated,
	useRouterState,
} from "@tanstack/react-router";
import { useAppSession } from "#/integrations/better-auth/use-app-session";
import {
	emptyOwnRecipeSearch,
	type OwnRecipeSearch,
	type PublicRecipeSearch,
	readOwnRecipeSearch,
	readPublicRecipeSearch,
} from "../domain/recipe-search-history";

// レシピの画面（自分のレシピ・みんなのレシピ）で、履歴（history state）に持つ検索の条件を読み書きする。
// 条件は、いまの人のものだけを読むので、ログイン状態を確かめ終えるまでは、条件を読まない（isRestoring）。
// その間、自分のレシピの一覧は描かない（絞り込む前の全件が、一瞬見えないように。再読み込みの直後など）。
// userId は、いまの人の条件だけを読み、別の人へ引き継がないために使う（表示の切り替えで、認可ではない）。
// pathname は、この画面のパス。
export function useRecipeSearchHistory(
	pathname: "/recipes" | "/recipes/public",
) {
	const isHydrated = useHydrated();
	const session = useAppSession();
	const userId = session.data?.user.id ?? null;
	const isReady = isHydrated && !session.isPending;
	// いま画面に出ている履歴の項目の state。
	// 別の画面へ移る読み込みの間（レシピを開いた直後など）、location はもう移り先の項目なので、
	// この画面のパスでなければ、画面を描いたときの項目（resolvedLocation）を読む（条件が外れて、全件が一瞬見えないように）。
	const shownState = useRouterState({
		select: (state) => {
			if (state.location.pathname === pathname) return state.location.state;
			if (state.resolvedLocation?.pathname === pathname) {
				return state.resolvedLocation.state;
			}
			return state.location.state;
		},
	});
	const storedOwn = shownState.ownRecipeSearch;
	const storedPublic = shownState.publicRecipeSearch;
	// 履歴の項目の番号。打つたびの書き換え（replace）では変わらず、切り替え・戻る・進むで変わる。
	const entryIndex = shownState.__TSR_index;

	return {
		isRestoring: !isReady,
		own: isReady
			? readOwnRecipeSearch(storedOwn, userId)
			: emptyOwnRecipeSearch,
		lastPublic: isReady ? readPublicRecipeSearch(storedPublic, userId) : null,
		// 条件を読み直したとき（履歴の項目・持ち主が変わったとき）だけ変わる。
		restoreKey: isReady ? `${entryIndex}:${userId ?? ""}` : "restoring",
		// 履歴へ書く state。ログインしていなければ、書かない。
		withOwnSearch:
			(next: OwnRecipeSearch) =>
			(prev: HistoryState): HistoryState =>
				userId === null
					? prev
					: { ...prev, ownRecipeSearch: { ...next, userId } },
		withPublicSearch:
			(search: PublicRecipeSearch) =>
			(prev: HistoryState): HistoryState =>
				userId === null
					? prev
					: { ...prev, publicRecipeSearch: { ...search, userId } },
	};
}
