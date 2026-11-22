// Better Auth のセッション Cookie（`better-auth.session_token`。https では `__Secure-` が付く）があるか。
// Cookie のないリクエスト（bot のスキャンなど）は、DB に接続せずに、未ログインとして扱うために使う。
// 値の正しさは確認しない（確認は、DB を使う `auth.api.getSession` が行う）。
const sessionCookiePattern =
	/(?:^|;\s*)(?:__Secure-)?better-auth\.session_token=[^;\s]+/u;

export function hasSessionCookie(
	cookieHeader: string | null | undefined,
): boolean {
	return cookieHeader != null && sessionCookiePattern.test(cookieHeader);
}

// アプリは、Cookie の代わりに `Authorization: Bearer <token>` でセッションを送る（Better Auth の bearer プラグイン）。
const bearerPattern = /^bearer\s+\S+/iu;

// セッションの資格（Cookie か bearer）があるか。値の正しさは確かめない（hasSessionCookie と同じ）。
export function hasSessionCredential(headers: Headers): boolean {
	const authorization = headers.get("authorization");

	return (
		hasSessionCookie(headers.get("cookie")) ||
		(authorization != null && bearerPattern.test(authorization))
	);
}
