import { type JWTVerifyGetKey, jwtVerify } from "jose";

// Cloudflare Access が付ける、署名つきのトークン。ページへのリクエストには、ヘッダーが付く。
// 画面からの、サーバー関数の呼び出し（/_serverFn/…）には、ヘッダーが付かず、同じトークンが Cookie（CF_Authorization）で届く。
const accessHeaderName = "cf-access-jwt-assertion";
const accessCookieName = "CF_Authorization";

export function extractAccessToken(headers: {
	get(name: string): string | null;
}): string | null {
	const fromHeader = headers.get(accessHeaderName)?.trim();

	if (fromHeader) {
		return fromHeader;
	}

	const cookie = headers.get("cookie");

	if (!cookie) {
		return null;
	}

	for (const part of cookie.split(";")) {
		const [name, ...value] = part.trim().split("=");

		if (name === accessCookieName && value.length > 0) {
			return value.join("=") || null;
		}
	}

	return null;
}

// カンマ区切りのメールアドレスの一覧（大文字・小文字は区別しない）。
export function parseAdminEmails(value: string | undefined): string[] {
	return (value ?? "")
		.split(",")
		.map((email) => email.trim().toLowerCase())
		.filter((email) => email !== "");
}

export function isAdminEmail(
	email: string,
	adminEmails: readonly string[],
): boolean {
	return adminEmails.includes(email.trim().toLowerCase());
}

// Access のトークンを検証する（署名・発行元・対象のアプリ・期限）。正しければ、メールアドレスを返す。
export async function verifyAccessToken(
	token: string,
	options: { issuer: string; audience: string; getKey: JWTVerifyGetKey },
): Promise<{ email: string } | null> {
	try {
		const { payload } = await jwtVerify(token, options.getKey, {
			issuer: options.issuer,
			audience: options.audience,
		});

		return typeof payload.email === "string" && payload.email !== ""
			? { email: payload.email }
			: null;
	} catch {
		return null;
	}
}
