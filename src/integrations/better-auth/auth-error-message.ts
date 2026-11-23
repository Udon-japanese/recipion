import authData from "../../../shared-data/auth.json";

// Better Auth のクライアントが返すエラー（{ code, message, status }）を、画面に出す日本語の文にする。
// 文の一覧は、アプリ（Kotlin）と共通で shared-data/auth.json に置く。
type AuthClientError = {
	code?: string | undefined;
	message?: string | undefined;
	status?: number | undefined;
};

export const AUTH_RATE_LIMITED_CODE = authData.rateLimitedCode;

const messagesByCode: Readonly<Record<string, string>> =
	authData.errorMessagesByCode;

export function getAuthErrorMessage(
	error: AuthClientError | null | undefined,
): string {
	const byCode = error?.code ? messagesByCode[error.code] : undefined;

	if (byCode !== undefined) {
		return byCode;
	}

	if (error?.status === 429) {
		return authData.errorMessagesByCode.AUTH_RATE_LIMITED;
	}

	return authData.fallbackErrorMessage;
}
