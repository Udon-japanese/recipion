// アプリが Play Integrity の requestHash に入れる値（アプリも同じ作り方をする）。
// トークンを「このメールアドレスへのコードの送信」に結び付け、別の要求に使い回せなくする。
// メールアドレスをそのまま入れない（Google の資料が、平文を入れないように勧めている）。
export async function sendCodeRequestHash(email: string): Promise<string> {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		new TextEncoder().encode(`send-code:${email}`),
	);

	return [...new Uint8Array(digest)]
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}
