import { GENERIC_ERROR_MESSAGE, UserFacingError } from "./user-facing-error";

type ErrorLogger = (message: string, error: unknown) => void;

// サーバー関数が投げたエラーを、画面に返してよい形にする（純粋な判断。ログの出力先は引数）。
// - Error でないもの（redirect・notFound は Response や専用のオブジェクト）は、そのまま通す。
// - UserFacingError は、文を保ったまま通す。
// - それ以外は、原因ごとサーバーのログに残し、汎用文のエラーに替える（SQL・接続先・外部サービスの応答を出さない）。
export function hideInternalError(
	error: unknown,
	log: ErrorLogger = (message, cause) => console.error(message, cause),
): unknown {
	if (!(error instanceof Error)) {
		return error;
	}

	if (error instanceof UserFacingError) {
		return error;
	}

	log("[server-function] internal error", error);

	return new UserFacingError(GENERIC_ERROR_MESSAGE);
}
