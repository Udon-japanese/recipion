// Better Auth のクライアントが返すエラー（{ code, message, status }）を、画面に出す日本語の文にする。
type AuthClientError = {
	code?: string | undefined;
	message?: string | undefined;
	status?: number | undefined;
};

// レート制限（auth.ts の hooks.before）が返すコード。
export const AUTH_RATE_LIMITED_CODE = "AUTH_RATE_LIMITED";

const messagesByCode: Record<string, string> = {
	INVALID_OTP: "コードが正しくありません。",
	OTP_EXPIRED: "コードの有効期限が切れました。コードを再送してください。",
	TOO_MANY_ATTEMPTS: "入力の回数が上限に達しました。コードを再送してください。",
	[AUTH_RATE_LIMITED_CODE]:
		"短い時間に何度も試行されました。しばらく待ってからやり直してください。",
	VERIFICATION_FAILED: "ボットの判定に失敗しました。もう一度お試しください。",
	MISSING_RESPONSE:
		"ボットの判定が完了していません。少し待ってからお試しください。",
};

export function getAuthErrorMessage(
	error: AuthClientError | null | undefined,
): string {
	if (error?.code && messagesByCode[error.code]) {
		return messagesByCode[error.code] as string;
	}

	if (error?.status === 429) {
		return messagesByCode[AUTH_RATE_LIMITED_CODE] as string;
	}

	return "ログインの処理に失敗しました。時間をおいてもう一度お試しください。";
}
