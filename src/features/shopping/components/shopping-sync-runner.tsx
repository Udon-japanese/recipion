import { useEffect } from "react";
import type { RequestFailureKind } from "#/errors/classify-request-error";
import { useAppSession } from "#/integrations/better-auth/use-app-session";
import type {
	ShoppingSyncReason,
	ShoppingSyncRequester,
} from "../application/request-shopping-sync";
import { useShoppingOwnerScope } from "../hooks/use-shopping-owner-scope";
import { watchShoppingSyncPending } from "../infrastructure/dexie-shopping-sync-store";
import { shoppingSyncStatusStore } from "../infrastructure/shopping-sync-status";

type UserScope = `user:${string}`;

type ShoppingSyncRunnerProps = {
	// サーバー関数を呼ぶ同期（ルートから渡す。テストでは差し替える）。
	sync: ShoppingSyncRequester;
	watchPending?: typeof watchShoppingSyncPending;
	markWaiting?: (ownerScope: UserScope) => void;
};

// 送り直すまでの待ち（失敗が続くほど延ばし、それ以降は最後の間隔）。
export const shoppingSyncRetryDelaysMs = [2000, 5000, 15000, 30000, 60000];

function isUserScope(value: string | null): value is UserScope {
	return value?.startsWith("user:") ?? false;
}

// 待てば通るかもしれない失敗（通信がない・届かなかった、サーバーの一時的な障害）。
// ログインの切れ・別のアカウント・内容で断られた、は送り直さない。
function isTransientFailure(failure: RequestFailureKind | null): boolean {
	return failure === "offline" || failure === "server";
}

// ログインしている間、買い物メモをサーバーと同期する（画面には何も出さない。どの画面でも動く）。
// 時機：開いたとき・ログインしたとき・書いたとき（すぐ）・ウィンドウに戻ったとき（focus）・
// 画面が見えた・隠れたとき（visibilitychange）・通信が戻ったとき。
// 書いたときの依頼は、同期の最中なら、終わったあとに必ずもう1回同期する。それ以外の依頼は、同期の最中なら、その同期にまとめる。
// まだ送っていない変更が残ったまま、通信かサーバーの一時的な理由で失敗したときだけ、間隔をあけて送り直す
// （画面が見えていて、オンラインの間だけ。送り終えたら止める。何もないときは、DB に問い合わせない）。
// 隠れるときの送信は、ページを離れると最後まで届く保証がない。届かなかった分は、送る印が端末に残り、次に開いたときに送る。
// 一定の間隔では聞きに行かない。
// ログイン状態の取り直しに失敗している間（isUnconfirmed）も、手元のセッションが同じ人なら同期する。
// 本人かは、サーバーが毎回、Cookie のセッションと expectedUserId で確かめる（requireSession）。
export function ShoppingSyncRunner({
	sync,
	watchPending = watchShoppingSyncPending,
	markWaiting = shoppingSyncStatusStore.markWaiting,
}: ShoppingSyncRunnerProps) {
	const ownerScope = useShoppingOwnerScope();
	const { data } = useAppSession();
	const userScope = isUserScope(ownerScope) ? ownerScope : null;
	const canSync =
		userScope !== null &&
		data !== null &&
		data !== undefined &&
		`user:${data.user.id}` === userScope;

	useEffect(() => {
		if (userScope === null) {
			return;
		}

		if (!canSync) {
			markWaiting(userScope);

			return;
		}

		let isActive = true;
		let pendingCount = 0;
		let retryTimer: number | undefined;
		let retryStep = 0;

		const stopRetry = () => {
			window.clearTimeout(retryTimer);
			retryTimer = undefined;
			retryStep = 0;
		};

		const scheduleRetry = () => {
			if (
				retryTimer !== undefined ||
				document.visibilityState !== "visible" ||
				!navigator.onLine
			) {
				// 隠れている・オフラインの間は、visibilitychange・online で、また頼む。
				return;
			}

			const delay =
				shoppingSyncRetryDelaysMs[
					Math.min(retryStep, shoppingSyncRetryDelaysMs.length - 1)
				] ?? 60_000;

			retryStep += 1;
			retryTimer = window.setTimeout(() => {
				retryTimer = undefined;
				request("wake");
			}, delay);
		};

		const request = (reason: ShoppingSyncReason) => {
			void sync(userScope, reason).then((failure) => {
				if (!isActive) {
					return;
				}

				if (failure === null) {
					stopRetry();
				} else if (isTransientFailure(failure) && pendingCount > 0) {
					scheduleRetry();
				}
			});
		};

		const onWake = () => request("wake");

		request("wake");
		// 見えたときは受け取り、隠れるときは、まだ送っていない変更を送っておく。
		document.addEventListener("visibilitychange", onWake);
		window.addEventListener("focus", onWake);
		window.addEventListener("online", onWake);

		const stopWatching = watchPending(
			userScope,
			(count) => {
				pendingCount = count;

				// 数が同じでも頼む（送り終えた印と、新しく書いた印が、1回の知らせにまとまることがある）。
				if (count === 0) {
					stopRetry();
				} else {
					request("write");
				}
			},
			() => {},
		);

		return () => {
			isActive = false;
			document.removeEventListener("visibilitychange", onWake);
			window.removeEventListener("focus", onWake);
			window.removeEventListener("online", onWake);
			stopRetry();
			stopWatching();
		};
	}, [userScope, canSync, sync, watchPending, markWaiting]);

	return null;
}
