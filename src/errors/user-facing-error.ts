// 利用者にそのまま見せてよい文のエラー（入力の誤り・見つからない・上限・ログインが必要 など）。
// これ以外のエラー（DB・ネットワーク・設定・外部サービスの失敗）は、内部の事情を含むので、画面に出さない。
export class UserFacingError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "UserFacingError";
	}
}

// ログインが必要なとき（セッションがない）のエラーの文。画面は、これを見て、ログインを案内する。
export const AUTH_REQUIRED_MESSAGE = "認証が必要です";

export function isAuthRequiredError(error: unknown): boolean {
	return error instanceof Error && error.message === AUTH_REQUIRED_MESSAGE;
}

// 内部のエラーの代わりに、画面に出す文。
export const GENERIC_ERROR_MESSAGE =
	"うまく処理できませんでした。時間をおいて、もう一度お試しください。";

const japanesePattern = /[぀-ヿ㐀-鿿]/u;

// 画面に出してよい文を取り出す。
// サーバーの処理（ミドルウェアが、内部のエラーを汎用文に替えている）の文はそのまま出す。
// ブラウザの中のエラー（ネットワークの失敗・ローカル DB など。英語の文）は、fallback にする。
export function describeError(
	error: unknown,
	fallback: string = GENERIC_ERROR_MESSAGE,
): string {
	if (error instanceof Error && japanesePattern.test(error.message)) {
		return error.message;
	}

	return fallback;
}
