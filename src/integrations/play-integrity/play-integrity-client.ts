import { importPKCS8, SignJWT } from "jose";
import * as v from "valibot";
import { decodeResponseSchema } from "./integrity-verdict";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/playintegrity";
// Google の上限は 1 時間。
const ASSERTION_LIFETIME_SECONDS = 60 * 60;
// 期限の直前のトークンを使わない（Google に届くまでに切れないように）。
const REFRESH_MARGIN_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

// Google Cloud のサービスアカウントの鍵（JSON）のうち、使う項目。
const serviceAccountSchema = v.object({
	client_email: v.string(),
	private_key: v.string(),
});

const accessTokenResponseSchema = v.object({
	access_token: v.string(),
	expires_in: v.number(),
});

type CachedAccessToken = { token: string; expiresAt: number };

export type PlayIntegrityClient = {
	// トークンを Google で読み解いた判定（tokenPayloadExternal）。読み解けなければ、例外を投げる。
	decode(packageName: string, integrityToken: string): Promise<unknown>;
};

// サービスアカウントの鍵で、Google の API を呼ぶ。アクセストークンは、期限まで使い回す。
// https://developers.google.com/identity/protocols/oauth2/service-account#httprest
export function createPlayIntegrityClient(
	serviceAccountJson: string,
	fetcher: typeof fetch = fetch,
	now: () => number = Date.now,
): PlayIntegrityClient {
	const account = v.parse(serviceAccountSchema, JSON.parse(serviceAccountJson));
	let cached: CachedAccessToken | null = null;

	async function getAccessToken(): Promise<string> {
		const current = now();

		if (cached && cached.expiresAt - REFRESH_MARGIN_MS > current) {
			return cached.token;
		}

		const key = await importPKCS8(account.private_key, "RS256");
		const issuedAt = Math.floor(current / 1000);
		const assertion = await new SignJWT({ scope: SCOPE })
			.setProtectedHeader({ alg: "RS256", typ: "JWT" })
			.setIssuer(account.client_email)
			.setAudience(TOKEN_URL)
			.setIssuedAt(issuedAt)
			.setExpirationTime(issuedAt + ASSERTION_LIFETIME_SECONDS)
			.sign(key);
		const response = await fetcher(TOKEN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
				assertion,
			}),
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		});

		if (!response.ok) {
			throw new Error(
				`Google のアクセストークンを取れませんでした: ${response.status}`,
			);
		}

		const body = v.parse(accessTokenResponseSchema, await response.json());
		cached = {
			token: body.access_token,
			expiresAt: current + body.expires_in * 1000,
		};

		return body.access_token;
	}

	return {
		async decode(packageName, integrityToken) {
			const accessToken = await getAccessToken();
			const response = await fetcher(
				`https://playintegrity.googleapis.com/v1/${encodeURIComponent(packageName)}:decodeIntegrityToken`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ integrityToken }),
					signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
				},
			);

			if (!response.ok) {
				throw new Error(
					`Play Integrity のトークンを読み解けませんでした: ${response.status}`,
				);
			}

			return v.parse(decodeResponseSchema, await response.json())
				.tokenPayloadExternal;
		},
	};
}
