import { isTrustedVerdict } from "./integrity-verdict";
import type { PlayIntegrityClient } from "./play-integrity-client";
import { sendCodeRequestHash } from "./request-hash";

export const ANDROID_PACKAGE_NAME = "app.recipion.android";

// アプリは、送信の直前にトークンを取る。古いトークンは、使い回しとみなす。
const MAX_TOKEN_AGE_MS = 2 * 60_000;

// コードの送信に付いてきた Play Integrity のトークンを確かめる。
// Google に届かない・読み解けないときも false（呼ぶ側は、証明なしとして扱う）。
export async function verifySendCodeIntegrity(
	client: PlayIntegrityClient,
	integrityToken: string,
	email: string,
	now: Date = new Date(),
): Promise<boolean> {
	try {
		const payload = await client.decode(ANDROID_PACKAGE_NAME, integrityToken);

		return isTrustedVerdict(payload, {
			packageName: ANDROID_PACKAGE_NAME,
			requestHash: await sendCodeRequestHash(email),
			now,
			maxAgeMs: MAX_TOKEN_AGE_MS,
		});
	} catch (error) {
		console.warn("[play-integrity] トークンを確かめられませんでした", error);

		return false;
	}
}
