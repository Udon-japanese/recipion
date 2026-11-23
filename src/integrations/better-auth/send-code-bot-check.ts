import { CLIENT_HEADER, parseClientHeader } from "#/api/client-version";

export const CAPTCHA_HEADER = "x-captcha-response";
export const INTEGRITY_HEADER = "x-recipion-integrity";

export type SendCodeBotCheck =
	// 人であることを確かめられた。通常のレート制限で通す。
	| { status: "verified" }
	// アプリで、証明が取れなかった（Play ストアのない端末・通信の失敗など、本物の利用者もいる）。
	// 断らずに、全体で1つの厳しい上限（auth-rate-limit.ts）で通す。
	| { status: "unverified" }
	// Web で、Turnstile のトークンがない・正しくない。コードは Better Auth の captcha プラグインと同じ（画面のエラーの文に使う）。
	| { status: "rejected"; code: "MISSING_RESPONSE" | "VERIFICATION_FAILED" };

export type SendCodeVerifiers = {
	// 正しければ true、断られたら false。確かめられないときは、例外を投げる。
	turnstile(token: string): Promise<boolean>;
	// 信頼できる判定なら true。確かめられないときも false（証明なしとして扱う）。
	playIntegrity(token: string, email: string): Promise<boolean>;
};

type SendCodeRequest = {
	headers: Headers;
	email: string | null;
};

// コードの送信の要求が、どの証明を持っているかで、通し方を決める。
// Web は Turnstile、Android は Play Integrity。アプリの名乗り（x-recipion-client）は偽れるので、
// 証明なしの枠は、全体の上限で守る。
export async function checkSendCodeRequest(
	{ headers, email }: SendCodeRequest,
	verifiers: SendCodeVerifiers,
): Promise<SendCodeBotCheck> {
	const captchaToken = headers.get(CAPTCHA_HEADER);

	if (captchaToken) {
		return (await verifiers.turnstile(captchaToken))
			? { status: "verified" }
			: { status: "rejected", code: "VERIFICATION_FAILED" };
	}

	const platform = parseClientHeader(
		headers.get(CLIENT_HEADER) ?? "",
	)?.platform;

	if (platform !== "android" && platform !== "ios") {
		return { status: "rejected", code: "MISSING_RESPONSE" };
	}

	const integrityToken = headers.get(INTEGRITY_HEADER);

	if (
		platform === "android" &&
		integrityToken &&
		email !== null &&
		(await verifiers.playIntegrity(integrityToken, email))
	) {
		return { status: "verified" };
	}

	return { status: "unverified" };
}
