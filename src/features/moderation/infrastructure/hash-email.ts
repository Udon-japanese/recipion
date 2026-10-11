import { normalizeEmailForBan } from "../domain/email-for-ban";

// 永久停止のメールアドレスの照合用ハッシュ。HMAC-SHA256（秘密の値を混ぜるので、ハッシュだけから、元のアドレスを推測されにくい）。
export async function hashEmailForBan(
	email: string,
	secret: string,
): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(`banned-email:${secret}`),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(normalizeEmailForBan(email)),
	);

	return [...new Uint8Array(signature)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}
