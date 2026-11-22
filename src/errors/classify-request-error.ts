import { ApiError } from "./api-error";
import type { ErrorCode } from "./error-codes";
import { UserFacingError } from "./user-facing-error";

// API の呼び出しが失敗した理由。
// - offline：届かなかった（通信がない・切れた）。通信が戻れば、同じものを送り直せばよい。
// - account：ログインしていない・別のアカウントになった・停止中。送り直しても通らない（ログインの状態が変わるまで待つ）。
// - rejected：内容で断られた（換算できない、など。文は画面に出してよい）。送り直しても、同じ結果になる。
// - server：サーバーの中の失敗（DB の障害など。文は汎用）。時間をおけば、通るかもしれない。
export type RequestFailureKind = "offline" | "account" | "rejected" | "server";

const accountErrorCodes: ReadonlySet<ErrorCode> = new Set([
	"AUTH_REQUIRED",
	"ACCOUNT_CHANGED",
	"ACCOUNT_SUSPENDED",
]);

function classifyByCode(code: ErrorCode): RequestFailureKind {
	if (accountErrorCodes.has(code)) {
		return "account";
	}

	return code === "INTERNAL" ? "server" : "rejected";
}

// API の失敗（ApiError）と、画面の中で投げた、利用者に見せてよい文のエラー（UserFacingError）は、コードで見分ける。
// それ以外（fetch の失敗など）は、届かなかったものとして扱う。
export function classifyRequestError(
	error: unknown,
	isOnline: boolean = typeof navigator === "undefined" || navigator.onLine,
): RequestFailureKind {
	if (!isOnline) {
		return "offline";
	}

	if (error instanceof ApiError || error instanceof UserFacingError) {
		return classifyByCode(error.code);
	}

	return "offline";
}
