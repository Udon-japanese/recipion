import teapotHtml from "./teapot-418.html?raw";

// 418 I'm a teapot（RFC 2324 の冗談のステータス）。/teapot を開いたときの応答。
// 自己完結の 1 枚のページ（れしぽよがお茶を注ぐ。小さな JavaScript つき）。ほとんど変えないので、ブラウザに 1 日保存させる。許可リストにない、ほかのパスは、WAF が 403 で止める。
export function createTeapotResponse(): Response {
	return new Response(teapotHtml, {
		status: 418,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "public, max-age=86400, stale-while-revalidate=604800",
			// 検索エンジンには載せない。
			"x-robots-tag": "noindex, nofollow",
		},
	});
}
