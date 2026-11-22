// Cookie でログインしている画面からの、変更を伴う要求が、同じオリジンから来たかを確かめる（CSRF の対策）。
// 判定は、TanStack Start の createCsrfMiddleware（サーバー関数に使っている）と同じ順にする：
// Sec-Fetch-Site → Origin → Referer。どれもなければ、断る。
// bearer（アプリ）の要求は、ブラウザが勝手に資格を付けることがないので、対象にしない（呼び出し側で分ける）。
export function isSameOriginRequest(
	headers: Headers,
	requestUrl: string,
): boolean {
	const requestOrigin = new URL(requestUrl).origin;
	const fetchSite = headers.get("sec-fetch-site");

	if (fetchSite !== null) {
		return fetchSite === "same-origin";
	}

	const origin = headers.get("origin");

	if (origin !== null) {
		return origin === requestOrigin;
	}

	const referer = headers.get("referer");

	if (referer === null) {
		return false;
	}

	try {
		return new URL(referer).origin === requestOrigin;
	} catch {
		return false;
	}
}

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

// 同じオリジンかを確かめる必要がある要求か：変更を伴い（GET・HEAD・OPTIONS 以外）、Cookie が付いている。
export function needsSameOriginCheck(
	method: string,
	headers: Headers,
): boolean {
	return !safeMethods.has(method.toUpperCase()) && headers.has("cookie");
}
