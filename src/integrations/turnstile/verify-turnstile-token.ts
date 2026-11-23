import * as v from "valibot";

const SITE_VERIFY_URL =
	"https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Turnstile が応答しないときに、要求を待たせ続けない（失敗として扱う）。
const VERIFY_TIMEOUT_MS = 10_000;

const siteVerifyResponseSchema = v.object({ success: v.boolean() });

type VerifyTurnstileTokenInput = {
	token: string;
	secretKey: string;
	remoteIp: string | null;
};

// トークンが正しければ true、Turnstile に断られたら false。Turnstile に届かないときは、例外を投げる。
// https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
export async function verifyTurnstileToken(
	{ token, secretKey, remoteIp }: VerifyTurnstileTokenInput,
	fetcher: typeof fetch = fetch,
): Promise<boolean> {
	const response = await fetcher(SITE_VERIFY_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			secret: secretKey,
			response: token,
			...(remoteIp ? { remoteip: remoteIp } : {}),
		}),
		signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
	});

	if (!response.ok) {
		throw new Error(`Turnstile の確認に失敗しました: ${response.status}`);
	}

	return v.parse(siteVerifyResponseSchema, await response.json()).success;
}
