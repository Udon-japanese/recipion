// ワンタイムコード認証のレート制限の方針。Workers の Rate Limiting バインディングを使う
// （https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/）。
//
// バインディングは、場所ごとに数えて、結果整合で、正確な集計には向かない（制限は、やや緩めに働く）。
// そのため、正規のユーザーが不便にならない範囲で、次の3つを組み合わせる。
// - コードの送信: メールアドレスごと（他人のアドレスへの「メール爆撃」を防ぐ）と、IP ごと。
// - コードの検証: IP ごと（コード自体の試行回数は、Better Auth の allowedAttempts でも制限される）。

export type RateLimiter = {
	limit(options: { key: string }): Promise<{ success: boolean }>;
};

export type AuthRateLimiters = {
	sendByEmail: RateLimiter;
	sendByIp: RateLimiter;
	verifyByIp: RateLimiter;
};

type AuthRequestInfo = {
	// Better Auth のエンドポイントのパス（basePath を除く）。
	path: string;
	email: string | null;
	ip: string;
};

export const SEND_CODE_PATH = "/email-otp/send-verification-otp";
export const VERIFY_CODE_PATH = "/sign-in/email-otp";
// アカウントの削除（確認のメールを送る）。メールの宛先ごとの制限は、送信のところ（auth.ts）で行う。
export const DELETE_USER_PATH = "/delete-user";

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

// キーに、メールアドレスをそのまま使わない（長さや文字の制約を避け、ログなどに残さない）。
async function hashedKey(prefix: string, value: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(value),
	);
	const hex = [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");

	return `${prefix}:${hex.slice(0, 32)}`;
}

// メールアドレス宛ての送信の制限に使うキー（ログイン用コードと、削除の確認メールで共通。同じ宛先への合計を数える）。
export async function emailRateLimitKey(email: string): Promise<string> {
	return hashedKey("email", normalizeEmail(email));
}

export async function checkAuthRateLimit(
	request: AuthRequestInfo,
	limiters: AuthRateLimiters,
): Promise<{ allowed: boolean }> {
	if (request.path === SEND_CODE_PATH) {
		const checks = [
			limiters.sendByIp.limit({ key: await hashedKey("ip", request.ip) }),
		];

		if (request.email) {
			checks.push(
				limiters.sendByEmail.limit({
					key: await hashedKey("email", normalizeEmail(request.email)),
				}),
			);
		}

		const results = await Promise.all(checks);

		return { allowed: results.every((result) => result.success) };
	}

	if (request.path === DELETE_USER_PATH) {
		const result = await limiters.sendByIp.limit({
			key: await hashedKey("ip", request.ip),
		});

		return { allowed: result.success };
	}

	if (request.path === VERIFY_CODE_PATH) {
		const result = await limiters.verifyByIp.limit({
			key: await hashedKey("ip", request.ip),
		});

		return { allowed: result.success };
	}

	return { allowed: true };
}
