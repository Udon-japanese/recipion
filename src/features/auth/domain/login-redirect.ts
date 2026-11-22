// ログインのあとに戻る先（/login?redirect=…）。アプリの中のパスだけを受け付ける（外のサイトへ飛ばされないように）。
const baseForCheck = "https://app.invalid";

// 戻ってよいパス（パスとクエリ）。だめなら undefined（ホームに移る）。フラグメントは捨てる。
export function toSafeRedirectPath(
	value: string | undefined,
): string | undefined {
	// 「//example.com」「/\example.com」は、ブラウザが別のサイトとして読むので、断る。
	if (
		value === undefined ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.startsWith("/\\")
	) {
		return undefined;
	}

	let url: URL;

	try {
		url = new URL(value, baseForCheck);
	} catch {
		return undefined;
	}

	if (url.origin !== baseForCheck || url.pathname.startsWith("/login")) {
		return undefined;
	}

	return `${url.pathname}${url.search}`;
}
