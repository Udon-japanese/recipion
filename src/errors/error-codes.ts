// API が返すエラーのコードと、HTTP の状態（1か所にまとめる）。
// 画面・アプリは、文ではなくコードで見分ける（文は表示用）。
export const errorCodeStatuses = {
	// ログインが必要（セッションがない・切れた）。
	AUTH_REQUIRED: 401,
	// 停止中のアカウント。
	ACCOUNT_SUSPENDED: 403,
	// 画面が思っているユーザーと、セッションのユーザーが違う。
	ACCOUNT_CHANGED: 403,
	// 権限がない（別のサイトからの送信を含む）。
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	// 先に別の変更があった（版の食い違いなど）。
	CONFLICT: 409,
	// 入力の誤り。
	INVALID_INPUT: 400,
	// 回数の上限。
	RATE_LIMITED: 429,
	// アプリ・画面が古く、API が受け付けない。
	CLIENT_UPDATE_REQUIRED: 426,
	// まだコードを付けていない、利用者に見せてよい文のエラー。
	// 移行のコード：機能を Hono に移すときに、それぞれのコードを付ける。すべての機能を移し終えたら、このコードは消す。
	USER_FACING: 400,
	// 内部のエラー（文は汎用のものに替える）。
	INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof errorCodeStatuses;

export function isErrorCode(value: unknown): value is ErrorCode {
	return typeof value === "string" && Object.hasOwn(errorCodeStatuses, value);
}

export type ErrorStatus = (typeof errorCodeStatuses)[ErrorCode];

export function statusForErrorCode(code: ErrorCode): ErrorStatus {
	return errorCodeStatuses[code];
}
