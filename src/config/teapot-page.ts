import teapotHtml from "./teapot-418.html?raw";

// 418 I'm a teapot（RFC 2324 の冗談のステータス）。/teapot を開いたときの応答。
// JavaScript なしの、CSS だけのページ（クリックすると、お茶が注がれる）。許可リストにない、ほかのパスは、WAF が 403 で止める。
export function createTeapotResponse(): Response {
	return new Response(teapotHtml, {
		status: 418,
		headers: {
			"content-type": "text/html; charset=utf-8",
			"cache-control": "public, max-age=3600",
			// 検索エンジンには載せない。
			"x-robots-tag": "noindex, nofollow",
		},
	});
}
