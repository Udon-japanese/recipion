import {
	ACCOUNT_SUSPENDED_MESSAGE,
	GENERIC_ERROR_MESSAGE,
	isAccountChangedError,
	isAuthRequiredError,
} from "./user-facing-error";

// サーバー関数の呼び出しが失敗した理由。
// - offline：届かなかった（通信がない・切れた）。通信が戻れば、同じものを送り直せばよい。
// - account：ログインしていない・別のアカウントになった・停止中。送り直しても通らない（ログインの状態が変わるまで待つ）。
// - rejected：内容で断られた（換算できない、など。文は画面に出してよい）。送り直しても、同じ結果になる。
// - server：サーバーの中の失敗（DB の障害など。文は汎用）。時間をおけば、通るかもしれない。
export type RequestFailureKind = "offline" | "account" | "rejected" | "server";

const japanesePattern = /[぀-ヿ㐀-鿿]/u;

// サーバーの処理は、利用者に見せてよい文（日本語）か、汎用の文を返す（hide-internal-error.ts）。
// それ以外（ブラウザの英語の文。fetch の失敗など）は、届かなかったものとして扱う。
export function classifyRequestError(
	error: unknown,
	isOnline: boolean = typeof navigator === "undefined" || navigator.onLine,
): RequestFailureKind {
	if (!isOnline) {
		return "offline";
	}

	if (
		isAuthRequiredError(error) ||
		isAccountChangedError(error) ||
		(error instanceof Error && error.message === ACCOUNT_SUSPENDED_MESSAGE)
	) {
		return "account";
	}

	if (!(error instanceof Error) || !japanesePattern.test(error.message)) {
		return "offline";
	}

	return error.message === GENERIC_ERROR_MESSAGE ? "server" : "rejected";
}
